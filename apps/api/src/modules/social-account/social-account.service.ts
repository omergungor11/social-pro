import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { SocialAccount, SocialPlatform } from "@social-pro/prisma";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { EncryptionService } from "./services/encryption.service";
import { PlatformRegistryService } from "./services/platform-registry.service";
import { OAuthConfigService, PlatformAvailability } from "./services/oauth-config.service";
import { ListAccountsQueryDto } from "./dto/list-accounts-query.dto";

export interface OAuthInitiation {
  authUrl: string;
  state: string;
}

export interface AccountHealthStatus {
  accountId: string;
  isActive: boolean;
  platform: SocialPlatform;
  platformUsername: string | null;
  tokenExpiresAt: Date | null;
  isTokenExpired: boolean;
  checkedAt: Date;
}

/**
 * Public representation of a SocialAccount with tokens omitted.
 * Tokens are never returned to callers — they are internal infrastructure.
 */
export type SocialAccountPublic = Omit<
  SocialAccount,
  "accessToken" | "refreshToken"
>;

@Injectable()
export class SocialAccountService {
  private readonly logger = new Logger(SocialAccountService.name);

  /**
   * API URL used to build platform OAuth callback URIs.
   * Must match the redirect URI registered in each platform's developer console.
   */
  private get apiUrl(): string {
    return process.env["API_URL"] ?? "http://localhost:4000";
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly platformRegistry: PlatformRegistryService,
    private readonly oauthConfigService: OAuthConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Listing
  // ---------------------------------------------------------------------------

  /**
   * Returns all social accounts for the agency, with optional filters.
   * Access tokens are stripped from the result.
   */
  async listAccounts(
    agencyId: string,
    query: ListAccountsQueryDto,
  ): Promise<SocialAccountPublic[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        agencyId,
        ...(query.platform != null && { platform: query.platform }),
        ...(query.clientId != null && { clientId: query.clientId }),
        ...(query.isActive != null && { isActive: query.isActive }),
      },
      orderBy: { connectedAt: "desc" },
    });

    return accounts.map((a) => this.stripTokens(a));
  }

  // ---------------------------------------------------------------------------
  // Platform availability
  // ---------------------------------------------------------------------------

  /**
   * Returns which platforms have credentials configured (DB or env vars).
   * Used by the frontend to determine which connect buttons to show.
   */
  async getAvailablePlatforms(): Promise<PlatformAvailability[]> {
    return this.oauthConfigService.getAvailablePlatforms();
  }

  // ---------------------------------------------------------------------------
  // OAuth initiation
  // ---------------------------------------------------------------------------

  /**
   * Generates the OAuth authorization URL for a platform and returns it along
   * with the opaque state token. The state encodes the agencyId so the
   * callback handler can look up the owning agency without a session.
   *
   * Throws BadRequestException when no credentials are configured for the
   * requested platform (neither in DB nor env vars).
   */
  async initiateOAuth(
    agencyId: string,
    platform: SocialPlatform,
  ): Promise<OAuthInitiation> {
    const credentials = await this.oauthConfigService.getCredentials(platform);

    if (!credentials) {
      throw new BadRequestException(
        `No OAuth credentials are configured for ${platform}. ` +
          "Please add credentials via the admin OAuth config endpoint or set the corresponding environment variables.",
      );
    }

    const connector = this.platformRegistry.getConnector(platform);

    // State: base64url-encoded JSON containing agencyId + random nonce
    const nonce = randomBytes(16).toString("hex");
    const statePayload = Buffer.from(
      JSON.stringify({ agencyId, nonce }),
    ).toString("base64url");

    const redirectUri = this.buildRedirectUri(platform);
    const authUrl = connector.getAuthUrl(statePayload, redirectUri, credentials);

    return { authUrl, state: statePayload };
  }

  // ---------------------------------------------------------------------------
  // OAuth callback
  // ---------------------------------------------------------------------------

  /**
   * Handles the OAuth callback from the platform.
   *
   * Steps:
   * 1. Decode the state to extract agencyId.
   * 2. Load platform credentials.
   * 3. Exchange the authorization code for tokens.
   * 4. Fetch the user profile.
   * 5. Encrypt tokens.
   * 6. Upsert the SocialAccount record.
   */
  async handleCallback(
    platform: SocialPlatform,
    code: string,
    state: string,
  ): Promise<SocialAccountPublic> {
    const { agencyId } = this.decodeState(state);

    const credentials = await this.oauthConfigService.getCredentials(platform);

    if (!credentials) {
      throw new BadRequestException(
        `No OAuth credentials are configured for ${platform}. ` +
          "Platform credentials may have been removed since the OAuth flow was initiated.",
      );
    }

    const connector = this.platformRegistry.getConnector(platform);
    const redirectUri = this.buildRedirectUri(platform);

    // For Twitter PKCE the state contains the verifier appended as :verifier
    // The connector handles extraction internally; pass full code through
    const tokens = await connector.exchangeCode(code, redirectUri, credentials);
    const profile = await connector.getUserProfile(tokens.accessToken);

    const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? this.encryption.encrypt(tokens.refreshToken)
      : null;

    const account = await this.prisma.socialAccount.upsert({
      where: {
        agencyId_platform_platformUserId: {
          agencyId,
          platform,
          platformUserId: profile.platformUserId,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes ?? [],
        platformUsername: profile.username ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        isActive: true,
        lastSyncedAt: new Date(),
      },
      create: {
        agencyId,
        platform,
        platformUserId: profile.platformUserId,
        platformUsername: profile.username ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt ?? null,
        scopes: tokens.scopes ?? [],
        isActive: true,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `Social account connected: platform=${platform} agencyId=${agencyId} platformUserId=${profile.platformUserId}`,
    );

    return this.stripTokens(account);
  }

  // ---------------------------------------------------------------------------
  // Find one
  // ---------------------------------------------------------------------------

  /**
   * Returns a single social account by ID, scoped to the agency.
   * Access tokens are stripped from the result.
   */
  async findOne(agencyId: string, accountId: string): Promise<SocialAccountPublic> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, agencyId },
    });
    if (!account) {
      throw new NotFoundException(`Social account '${accountId}' not found`);
    }
    return this.stripTokens(account);
  }

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------

  /**
   * Revokes the access token on the platform and deletes the account record.
   */
  async disconnect(agencyId: string, accountId: string): Promise<void> {
    const account = await this.assertExists(agencyId, accountId);

    try {
      const credentials = await this.oauthConfigService.getCredentials(
        account.platform,
      );

      if (credentials) {
        const connector = this.platformRegistry.getConnector(account.platform);
        const accessToken = this.encryption.decrypt(account.accessToken);
        await connector.revokeToken(accessToken, credentials);
      } else {
        this.logger.warn(
          `No credentials available for ${account.platform} — skipping token revocation for account ${accountId}`,
        );
      }
    } catch (err) {
      // Log but do not block deletion — token may already be invalid
      this.logger.warn(
        `Token revocation failed for account ${accountId}: ${String(err)}`,
      );
    }

    await this.prisma.socialAccount.delete({ where: { id: accountId } });

    this.logger.log(
      `Social account disconnected: id=${accountId} agencyId=${agencyId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Token refresh
  // ---------------------------------------------------------------------------

  /**
   * Forces a token refresh for a single account.
   * Marks the account as inactive when refresh fails.
   */
  async refreshAccountToken(accountId: string): Promise<SocialAccountPublic> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Social account '${accountId}' not found`);
    }

    if (!account.refreshToken) {
      throw new BadRequestException(
        `Social account '${accountId}' does not have a refresh token`,
      );
    }

    const credentials = await this.oauthConfigService.getCredentials(
      account.platform,
    );

    if (!credentials) {
      throw new BadRequestException(
        `No OAuth credentials are configured for ${account.platform}. ` +
          "Cannot refresh token without platform credentials.",
      );
    }

    const connector = this.platformRegistry.getConnector(account.platform);
    const decryptedRefreshToken = this.encryption.decrypt(account.refreshToken);

    try {
      const tokens = await connector.refreshToken(
        decryptedRefreshToken,
        credentials,
      );

      const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken);
      const encryptedRefreshToken = tokens.refreshToken
        ? this.encryption.encrypt(tokens.refreshToken)
        : account.refreshToken; // keep existing if platform does not rotate

      const updated = await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokens.expiresAt ?? null,
          scopes: tokens.scopes ?? account.scopes,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });

      this.logger.log(`Token refreshed for account: id=${accountId}`);
      return this.stripTokens(updated);
    } catch (err) {
      // Mark account inactive so UI can notify the user to re-connect
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: { isActive: false },
      });

      this.logger.error(
        `Token refresh failed for account ${accountId}: ${String(err)}`,
      );
      throw new UnauthorizedException(
        `Token refresh failed for account '${accountId}'. Please reconnect this account.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  /**
   * Verifies that the stored token is still usable by fetching the user
   * profile from the platform. Does not throw on token failure — returns
   * status information instead.
   */
  async checkHealth(accountId: string): Promise<AccountHealthStatus> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Social account '${accountId}' not found`);
    }

    const now = new Date();
    const isTokenExpired =
      account.tokenExpiresAt != null && account.tokenExpiresAt < now;

    if (isTokenExpired) {
      return {
        accountId,
        isActive: false,
        platform: account.platform,
        platformUsername: account.platformUsername,
        tokenExpiresAt: account.tokenExpiresAt,
        isTokenExpired: true,
        checkedAt: now,
      };
    }

    try {
      const connector = this.platformRegistry.getConnector(account.platform);
      const accessToken = this.encryption.decrypt(account.accessToken);
      await connector.getUserProfile(accessToken);

      // Token is valid — ensure isActive reflects reality
      if (!account.isActive) {
        await this.prisma.socialAccount.update({
          where: { id: accountId },
          data: { isActive: true },
        });
      }

      return {
        accountId,
        isActive: true,
        platform: account.platform,
        platformUsername: account.platformUsername,
        tokenExpiresAt: account.tokenExpiresAt,
        isTokenExpired: false,
        checkedAt: now,
      };
    } catch {
      // Mark inactive if the profile call fails
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: { isActive: false },
      });

      return {
        accountId,
        isActive: false,
        platform: account.platform,
        platformUsername: account.platformUsername,
        tokenExpiresAt: account.tokenExpiresAt,
        isTokenExpired: false,
        checkedAt: now,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Sync posts from platform
  // ---------------------------------------------------------------------------

  /**
   * Fetches recent posts/media from the connected social platform and creates
   * Post + PostTarget records for any items not yet in the database.
   *
   * Supports INSTAGRAM and FACEBOOK. Returns the count of newly synced posts.
   * Never throws on platform API failure — returns synced=0 with an error message.
   */
  async syncFromPlatform(
    agencyId: string,
    accountId: string,
  ): Promise<{ synced: number; message: string }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, agencyId },
    });

    if (!account) {
      throw new NotFoundException(`Social account '${accountId}' not found`);
    }

    let accessToken: string;
    try {
      accessToken = this.encryption.decrypt(account.accessToken);
    } catch {
      return { synced: 0, message: "Could not decrypt access token — please reconnect this account" };
    }

    const platform = account.platform;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let posts: any[] = [];

    try {
      if (platform === SocialPlatform.INSTAGRAM) {
        const url =
          `https://graph.facebook.com/v22.0/${account.platformUserId}/media` +
          `?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count` +
          `&limit=25&access_token=${accessToken}`;
        const response = await fetch(url);
        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (await response.json()) as { data?: any[] };
          posts = data.data ?? [];
        } else {
          const text = await response.text();
          this.logger.warn(
            `Instagram media fetch failed for account ${accountId}: ${response.status} ${text}`,
          );
          return { synced: 0, message: `Instagram API returned ${response.status}` };
        }
      } else if (platform === SocialPlatform.FACEBOOK) {
        const url =
          `https://graph.facebook.com/v22.0/${account.platformUserId}/posts` +
          `?fields=id,message,created_time,full_picture` +
          `&limit=25&access_token=${accessToken}`;
        const response = await fetch(url);
        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (await response.json()) as { data?: any[] };
          posts = data.data ?? [];
        } else {
          const text = await response.text();
          this.logger.warn(
            `Facebook posts fetch failed for account ${accountId}: ${response.status} ${text}`,
          );
          return { synced: 0, message: `Facebook API returned ${response.status}` };
        }
      } else {
        return { synced: 0, message: `Sync not yet supported for ${platform}` };
      }
    } catch (err) {
      this.logger.error(
        `Platform API call failed during sync for account ${accountId}: ${String(err)}`,
      );
      return { synced: 0, message: "Platform API call failed — check logs" };
    }

    // Resolve the user who will be the post creator (first agency member)
    const firstMember = await this.prisma.agencyMember.findFirst({
      where: { agencyId },
    });

    if (!firstMember) {
      return { synced: 0, message: "No agency member found to attribute posts to" };
    }

    let synced = 0;

    for (const p of posts) {
      const platformPostId = (p.id as string | undefined) ?? null;
      if (!platformPostId) continue;

      // Skip posts already synced for this social account
      const existing = await this.prisma.postTarget.findFirst({
        where: { platformPostId, socialAccountId: accountId },
      });
      if (existing) continue;

      const captionText: string =
        ((p.caption as string | undefined) ?? (p.message as string | undefined) ?? "").slice(0, 2000);

      const rawTimestamp: string | undefined =
        (p.timestamp as string | undefined) ?? (p.created_time as string | undefined);
      const publishedAt = rawTimestamp ? new Date(rawTimestamp) : new Date();

      try {
        await this.prisma.post.create({
          data: {
            agencyId,
            createdByUserId: firstMember.userId,
            clientId: account.clientId ?? null,
            title: captionText.slice(0, 100) || "Synced post",
            content: { text: captionText },
            status: "PUBLISHED",
            publishedAt,
            targets: {
              create: {
                socialAccountId: accountId,
                platformPostId,
                status: "PUBLISHED",
                publishedAt,
              },
            },
          },
        });
        synced++;
      } catch (err) {
        // Log and continue — one failed insert should not abort the whole sync
        this.logger.warn(
          `Failed to create post for platformPostId=${platformPostId}: ${String(err)}`,
        );
      }
    }

    this.logger.log(
      `Sync completed for account ${accountId}: synced=${synced} platform=${platform}`,
    );

    return { synced, message: `Synced ${synced} post${synced === 1 ? "" : "s"} from ${platform}` };
  }

  // ---------------------------------------------------------------------------
  // Helpers used by the token refresh job
  // ---------------------------------------------------------------------------

  /**
   * Returns accounts whose access token expires within the given number of
   * minutes. Used by the background token refresh job.
   */
  async findExpiringAccounts(withinMinutes: number): Promise<SocialAccount[]> {
    const cutoff = new Date(Date.now() + withinMinutes * 60 * 1000);

    return this.prisma.socialAccount.findMany({
      where: {
        isActive: true,
        refreshToken: { not: null },
        tokenExpiresAt: { lte: cutoff },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Private utilities
  // ---------------------------------------------------------------------------

  private stripTokens(account: SocialAccount): SocialAccountPublic {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken: _at, refreshToken: _rt, ...rest } = account;
    return rest;
  }

  private buildRedirectUri(platform: SocialPlatform): string {
    return `${this.apiUrl}/api/v1/social-accounts/oauth/${platform.toLowerCase()}/callback`;
  }

  private decodeState(state: string): { agencyId: string; nonce: string } {
    try {
      const json = Buffer.from(state, "base64url").toString("utf8");
      const parsed = JSON.parse(json) as {
        agencyId?: string;
        nonce?: string;
      };

      if (!parsed.agencyId) {
        throw new Error("Missing agencyId in state");
      }

      return { agencyId: parsed.agencyId, nonce: parsed.nonce ?? "" };
    } catch {
      throw new BadRequestException(
        "Invalid OAuth state parameter — possible CSRF attack",
      );
    }
  }

  private async assertExists(
    agencyId: string,
    accountId: string,
  ): Promise<SocialAccount> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, agencyId },
    });

    if (!account) {
      throw new NotFoundException(
        `Social account '${accountId}' not found in this agency`,
      );
    }

    return account;
  }
}
