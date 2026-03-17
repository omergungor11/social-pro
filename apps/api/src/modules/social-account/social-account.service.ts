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
   * Redirect URI base is read from the APP_URL environment variable.
   * Each platform callback route is appended at call time.
   */
  private get appUrl(): string {
    return process.env["APP_URL"] ?? "http://localhost:3000";
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly platformRegistry: PlatformRegistryService
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
    query: ListAccountsQueryDto
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
  // OAuth initiation
  // ---------------------------------------------------------------------------

  /**
   * Generates the OAuth authorization URL for a platform and returns it along
   * with the opaque state token. The state encodes the agencyId so the
   * callback handler can look up the owning agency without a session.
   */
  initiateOAuth(agencyId: string, platform: SocialPlatform): OAuthInitiation {
    const connector = this.platformRegistry.getConnector(platform);

    // State: base64url-encoded JSON containing agencyId + random nonce
    const nonce = randomBytes(16).toString("hex");
    const statePayload = Buffer.from(
      JSON.stringify({ agencyId, nonce })
    ).toString("base64url");

    const redirectUri = this.buildRedirectUri(platform);
    const authUrl = connector.getAuthUrl(statePayload, redirectUri);

    return { authUrl, state: statePayload };
  }

  // ---------------------------------------------------------------------------
  // OAuth callback
  // ---------------------------------------------------------------------------

  /**
   * Handles the OAuth callback from the platform.
   *
   * Steps:
   * 1. Decode the state to extract agencyId (and PKCE verifier for Twitter).
   * 2. Exchange the authorization code for tokens.
   * 3. Fetch the user profile.
   * 4. Encrypt tokens.
   * 5. Upsert the SocialAccount record.
   */
  async handleCallback(
    platform: SocialPlatform,
    code: string,
    state: string
  ): Promise<SocialAccountPublic> {
    const { agencyId } = this.decodeState(state);
    const connector = this.platformRegistry.getConnector(platform);
    const redirectUri = this.buildRedirectUri(platform);

    // For Twitter PKCE the state contains the verifier appended as :verifier
    // The connector handles extraction internally; pass full code through
    const tokens = await connector.exchangeCode(code, redirectUri);
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
      `Social account connected: platform=${platform} agencyId=${agencyId} platformUserId=${profile.platformUserId}`
    );

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
      const connector = this.platformRegistry.getConnector(account.platform);
      const accessToken = this.encryption.decrypt(account.accessToken);
      await connector.revokeToken(accessToken);
    } catch (err) {
      // Log but do not block deletion — token may already be invalid
      this.logger.warn(
        `Token revocation failed for account ${accountId}: ${String(err)}`
      );
    }

    await this.prisma.socialAccount.delete({ where: { id: accountId } });

    this.logger.log(
      `Social account disconnected: id=${accountId} agencyId=${agencyId}`
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
        `Social account '${accountId}' does not have a refresh token`
      );
    }

    const connector = this.platformRegistry.getConnector(account.platform);
    const decryptedRefreshToken = this.encryption.decrypt(account.refreshToken);

    try {
      const tokens = await connector.refreshToken(decryptedRefreshToken);

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
        `Token refresh failed for account ${accountId}: ${String(err)}`
      );
      throw new UnauthorizedException(
        `Token refresh failed for account '${accountId}'. Please reconnect this account.`
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
    return `${this.appUrl}/social-accounts/oauth/${platform.toLowerCase()}/callback`;
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
        "Invalid OAuth state parameter — possible CSRF attack"
      );
    }
  }

  private async assertExists(
    agencyId: string,
    accountId: string
  ): Promise<SocialAccount> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, agencyId },
    });

    if (!account) {
      throw new NotFoundException(
        `Social account '${accountId}' not found in this agency`
      );
    }

    return account;
  }
}
