import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EncryptionService } from "./encryption.service";
import type { OAuthCredentials } from "../interfaces/oauth-connector.interface";

export interface PlatformAvailability {
  platform: string;
  isAvailable: boolean;
  isEnabled: boolean;
  source: "database" | "env" | "none";
}

export interface PlatformOAuthConfigPublic {
  id: string;
  platform: string;
  clientIdHint: string; // masked: "••••abcd"
  isEnabled: boolean;
  scopes: string[];
  redirectUri: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CacheEntry {
  data: OAuthCredentials | null;
  expiresAt: number;
}

/**
 * Manages platform OAuth credentials with a DB-first, env-fallback strategy.
 *
 * Lookup chain: PlatformOAuthConfig (DB, decrypted) → env vars → null
 *
 * Results are cached in memory for CACHE_TTL_MS to avoid repeated DB hits on
 * every token exchange or OAuth initiation call.
 */
@Injectable()
export class OAuthConfigService {
  private readonly logger = new Logger(OAuthConfigService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds

  private readonly ENV_MAP: Record<string, { id: string; secret: string }> = {
    TWITTER: { id: "TWITTER_CLIENT_ID", secret: "TWITTER_CLIENT_SECRET" },
    FACEBOOK: { id: "FACEBOOK_CLIENT_ID", secret: "FACEBOOK_CLIENT_SECRET" },
    INSTAGRAM: {
      id: "INSTAGRAM_CLIENT_ID",
      secret: "INSTAGRAM_CLIENT_SECRET",
    },
    LINKEDIN: { id: "LINKEDIN_CLIENT_ID", secret: "LINKEDIN_CLIENT_SECRET" },
    TIKTOK: { id: "TIKTOK_CLIENT_ID", secret: "TIKTOK_CLIENT_SECRET" },
    YOUTUBE: { id: "YOUTUBE_CLIENT_ID", secret: "YOUTUBE_CLIENT_SECRET" },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Returns credentials for the given platform using the fallback chain:
   *   1. DB config (decrypted) — if a record exists and isEnabled
   *   2. Environment variables
   *   3. null — caller should throw a user-facing error
   */
  async getCredentials(
    platform: SocialPlatform,
  ): Promise<OAuthCredentials | null> {
    const cacheKey = platform.toString();
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const result = await this.resolveCredentials(platform);
    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return result;
  }

  private async resolveCredentials(
    platform: SocialPlatform,
  ): Promise<OAuthCredentials | null> {
    // 1. Try DB config
    try {
      const dbConfig = await this.prisma.platformOAuthConfig.findUnique({
        where: { platform },
      });

      if (dbConfig?.isEnabled) {
        const clientId = this.encryption.decrypt(dbConfig.clientId);
        const clientSecret = this.encryption.decrypt(dbConfig.clientSecret);

        return {
          clientId,
          clientSecret,
          scopes: dbConfig.scopes.length > 0 ? dbConfig.scopes : undefined,
        };
      }
    } catch (err) {
      this.logger.warn(
        `Failed to load DB OAuth config for ${platform}: ${String(err)}`,
      );
    }

    // 2. Fall back to env vars
    const envKeys = this.ENV_MAP[platform.toString()];
    if (envKeys) {
      const clientId = process.env[envKeys.id];
      const clientSecret = process.env[envKeys.secret];

      if (clientId && clientSecret) {
        return { clientId, clientSecret };
      }
    }

    // 3. Nothing found
    return null;
  }

  /**
   * Returns availability information for every platform.
   * Used by the frontend to show which platforms are ready to connect.
   */
  async getAvailablePlatforms(): Promise<PlatformAvailability[]> {
    const platforms = Object.values(SocialPlatform);
    const results: PlatformAvailability[] = [];

    // Fetch all DB configs in a single query
    const dbConfigs = await this.prisma.platformOAuthConfig.findMany();
    const dbConfigMap = new Map(dbConfigs.map((c) => [c.platform, c]));

    for (const platform of platforms) {
      const dbConfig = dbConfigMap.get(platform);
      const envKeys = this.ENV_MAP[platform.toString()];

      if (dbConfig?.isEnabled) {
        results.push({
          platform,
          isAvailable: true,
          isEnabled: true,
          source: "database",
        });
      } else if (
        envKeys &&
        process.env[envKeys.id] &&
        process.env[envKeys.secret]
      ) {
        results.push({
          platform,
          isAvailable: true,
          isEnabled: true,
          source: "env",
        });
      } else {
        results.push({
          platform,
          isAvailable: false,
          isEnabled: dbConfig?.isEnabled ?? false,
          source: "none",
        });
      }
    }

    return results;
  }

  /**
   * Creates or updates a platform OAuth config in the DB.
   * clientId and clientSecret are encrypted before storage.
   */
  async upsertConfig(
    platform: SocialPlatform,
    clientId: string,
    clientSecret: string,
    options?: {
      scopes?: string[];
      redirectUri?: string;
      isEnabled?: boolean;
    },
  ): Promise<void> {
    const encryptedClientId = this.encryption.encrypt(clientId);
    const encryptedClientSecret = this.encryption.encrypt(clientSecret);

    await this.prisma.platformOAuthConfig.upsert({
      where: { platform },
      update: {
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
        ...(options?.scopes !== undefined && { scopes: options.scopes }),
        ...(options?.redirectUri !== undefined && {
          redirectUri: options.redirectUri,
        }),
        ...(options?.isEnabled !== undefined && {
          isEnabled: options.isEnabled,
        }),
      },
      create: {
        platform,
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
        scopes: options?.scopes ?? [],
        redirectUri: options?.redirectUri ?? null,
        isEnabled: options?.isEnabled ?? true,
      },
    });

    this.invalidateCache(platform);
    this.logger.log(`OAuth config upserted for platform: ${platform}`);
  }

  /**
   * Returns all stored configs with client secrets masked.
   * Only the last 4 characters of clientId are shown as a hint.
   */
  async getAllConfigs(): Promise<PlatformOAuthConfigPublic[]> {
    const configs = await this.prisma.platformOAuthConfig.findMany({
      orderBy: { platform: "asc" },
    });

    return configs.map((config) => {
      let clientIdHint = "••••????";
      try {
        const decryptedId = this.encryption.decrypt(config.clientId);
        const lastFour = decryptedId.slice(-4);
        clientIdHint = `••••${lastFour}`;
      } catch {
        // If decryption fails, return a generic hint
      }

      return {
        id: config.id,
        platform: config.platform,
        clientIdHint,
        isEnabled: config.isEnabled,
        scopes: config.scopes,
        redirectUri: config.redirectUri,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    });
  }

  /**
   * Deletes the stored config for a platform and invalidates the cache entry.
   */
  async deleteConfig(platform: SocialPlatform): Promise<void> {
    await this.prisma.platformOAuthConfig.delete({ where: { platform } });
    this.invalidateCache(platform);
    this.logger.log(`OAuth config deleted for platform: ${platform}`);
  }

  private invalidateCache(platform: SocialPlatform): void {
    this.cache.delete(platform.toString());
  }
}
