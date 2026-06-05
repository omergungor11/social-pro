import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { SocialAccount, SocialPlatform, PostStatus } from "@social-pro/prisma";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../common/prisma/prisma.service";
import { EncryptionService } from "./services/encryption.service";
import { PlatformRegistryService } from "./services/platform-registry.service";
import { FacebookConnector } from "./connectors/facebook.connector";
import { InstagramConnector } from "./connectors/instagram.connector";
import { OAuthConfigService, PlatformAvailability } from "./services/oauth-config.service";
import { ListAccountsQueryDto } from "./dto/list-accounts-query.dto";

export interface OAuthInitiation {
  authUrl: string;
  state: string;
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  accessToken: string;
  pictureUrl?: string;
  followersCount?: number;
  category?: string;
}

type FacebookPage = Omit<FacebookPageInfo, "accessToken"> & { accessToken?: string };

export interface FacebookCallbackResult {
  type: "single" | "multiple" | "none";
  account?: SocialAccountPublic;
  pages?: FacebookPageInfo[];
  agencyId: string;
}

export interface InstagramAccountInfo {
  igId: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  pageAccessToken: string;
}

export interface InstagramCallbackResult {
  type: "multiple" | "none";
  accounts?: InstagramAccountInfo[];
  agencyId: string;
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

/**
 * Aggregated, per-account engagement metrics returned by listAccounts.
 * Followers/following/posts come from synced platform metadata; likes/comments
 * are summed across the account's synced post targets.
 */
export interface AccountMetricsPublic {
  followers: number;
  following: number;
  posts: number;
  likes: number;
  comments: number;
  impressions: number;
  engagementRate: number;
}

@Injectable()
export class SocialAccountService {
  private readonly logger = new Logger(SocialAccountService.name);
  private readonly fbPagesCache = new Map<string, { pages: FacebookPageInfo[]; scopes: string[]; expiresAt: number }>();
  private readonly igAccountsCache = new Map<string, { accounts: InstagramAccountInfo[]; scopes: string[]; expiresAt: number }>();

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
  ): Promise<Array<SocialAccountPublic & { metrics?: AccountMetricsPublic }>> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        agencyId,
        ...(query.platform != null && { platform: query.platform }),
        ...(query.clientId != null && { clientId: query.clientId }),
        ...(query.isActive != null && { isActive: query.isActive }),
      },
      orderBy: { connectedAt: "desc" },
    });

    if (accounts.length === 0) return [];

    // Aggregate per-account engagement from synced post targets.
    const targets = await this.prisma.postTarget.findMany({
      where: { socialAccountId: { in: accounts.map((a) => a.id) } },
      select: { socialAccountId: true, platformSpecificContent: true },
    });

    const engagementByAccount = new Map<
      string,
      { posts: number; likes: number; comments: number; impressions: number }
    >();
    for (const t of targets) {
      const agg =
        engagementByAccount.get(t.socialAccountId) ??
        { posts: 0, likes: 0, comments: 0, impressions: 0 };
      const psc =
        t.platformSpecificContent != null &&
        typeof t.platformSpecificContent === "object"
          ? (t.platformSpecificContent as Record<string, unknown>)
          : {};
      agg.posts += 1;
      agg.likes += typeof psc["likes"] === "number" ? psc["likes"] : 0;
      agg.comments += typeof psc["comments"] === "number" ? psc["comments"] : 0;
      agg.impressions += typeof psc["impressions"] === "number" ? psc["impressions"] : 0;
      engagementByAccount.set(t.socialAccountId, agg);
    }

    return accounts.map((a) => {
      const meta =
        a.metadata != null && typeof a.metadata === "object"
          ? (a.metadata as Record<string, unknown>)
          : {};
      const eng = engagementByAccount.get(a.id) ?? {
        posts: 0,
        likes: 0,
        comments: 0,
        impressions: 0,
      };

      const followers =
        typeof meta["followersCount"] === "number" ? meta["followersCount"] : 0;
      const following =
        typeof meta["followingCount"] === "number" ? meta["followingCount"] : 0;
      // Prefer the platform-reported post count; fall back to synced post count.
      const posts =
        typeof meta["postsCount"] === "number" && meta["postsCount"] > 0
          ? meta["postsCount"]
          : eng.posts;

      // Engagement rate = average interactions per post ÷ followers × 100.
      // Using total interactions ÷ followers inflates the rate for accounts
      // with many posts and few followers (e.g. 359%); the per-post average is
      // the standard definition.
      const engagedPosts = eng.posts > 0 ? eng.posts : 0;
      const avgInteractionsPerPost =
        engagedPosts > 0 ? (eng.likes + eng.comments) / engagedPosts : 0;
      const engagementRate =
        followers > 0 ? (avgInteractionsPerPost / followers) * 100 : 0;

      const metrics: AccountMetricsPublic = {
        followers,
        following,
        posts,
        likes: eng.likes,
        comments: eng.comments,
        impressions: eng.impressions,
        engagementRate: Number(engagementRate.toFixed(2)),
      };

      return { ...this.stripTokens(a), metrics };
    });
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
    // Twitter PKCE: state is "base64url(json):codeVerifier" — split before decoding
    let effectiveState = state;
    let codeVerifier = "";
    if (platform === SocialPlatform.TWITTER) {
      const lastColon = state.lastIndexOf(":");
      if (lastColon > 0) {
        effectiveState = state.slice(0, lastColon);
        codeVerifier = state.slice(lastColon + 1);
      }
    }

    const { agencyId } = this.decodeState(effectiveState);

    const credentials = await this.oauthConfigService.getCredentials(platform);

    if (!credentials) {
      throw new BadRequestException(
        `No OAuth credentials are configured for ${platform}. ` +
          "Platform credentials may have been removed since the OAuth flow was initiated.",
      );
    }

    const connector = this.platformRegistry.getConnector(platform);
    const redirectUri = this.buildRedirectUri(platform);

    // For Twitter PKCE: pass code as "code:verifier" so connector can extract both
    const effectiveCode = codeVerifier ? `${code}:${codeVerifier}` : code;
    const tokens = await connector.exchangeCode(effectiveCode, redirectUri, credentials);
    const profile = await connector.getUserProfile(tokens.accessToken);

    const encryptedAccessToken = this.encryption.encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken
      ? this.encryption.encrypt(tokens.refreshToken)
      : null;

    // Extract extra metadata from profile (Twitter provides public_metrics)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileAny = profile as any;
    const metadata: Record<string, string | number | boolean> = {};
    if (profileAny.followersCount != null) metadata.followersCount = profileAny.followersCount as number;
    if (profileAny.followingCount != null) metadata.followingCount = profileAny.followingCount as number;
    if (profileAny.tweetCount != null) metadata.postsCount = profileAny.tweetCount as number;
    if (profileAny.description != null) metadata.bio = profileAny.description as string;

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
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
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
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      },
    });

    this.logger.log(
      `Social account connected: platform=${platform} agencyId=${agencyId} platformUserId=${profile.platformUserId}`,
    );

    return this.stripTokens(account);
  }

  // ---------------------------------------------------------------------------
  // Facebook Page selection flow
  // ---------------------------------------------------------------------------

  async handleFacebookCallback(
    code: string,
    state: string,
  ): Promise<FacebookCallbackResult> {
    const { agencyId } = this.decodeState(state);

    const credentials = await this.oauthConfigService.getCredentials(
      SocialPlatform.FACEBOOK,
    );

    if (!credentials) {
      throw new BadRequestException(
        "No OAuth credentials are configured for FACEBOOK. " +
          "Platform credentials may have been removed since the OAuth flow was initiated.",
      );
    }

    const connector = this.platformRegistry.getConnector(
      SocialPlatform.FACEBOOK,
    ) as FacebookConnector;
    const redirectUri = this.buildRedirectUri(SocialPlatform.FACEBOOK);

    const tokens = await connector.exchangeCode(code, redirectUri, credentials);

    // Try short-lived token first (preserves all page permissions from OAuth dialog),
    // fall back to long-lived token
    const shortToken = connector.getLastShortLivedToken();
    let pages = await connector.getPages(shortToken ?? tokens.accessToken);

    // If short-lived returned fewer pages, also try with long-lived and merge
    if (shortToken) {
      const longPages = await connector.getPages(tokens.accessToken);
      const existingIds = new Set(pages.map((p) => p.id));
      for (const p of longPages) {
        if (!existingIds.has(p.id)) {
          pages.push(p);
        }
      }
    }

    this.logger.log(`Facebook pages total: ${pages.length} — ${pages.map((p) => p.name).join(", ")}`);

    if (pages.length === 0) {
      return { type: "none", agencyId };
    }

    // Store pages with tokens in memory cache (keyed by agencyId, expires in 10 min)
    // Always show selection modal — even with 1 page, let user confirm
    const cacheKey = `fb_pages_${agencyId}`;
    this.fbPagesCache.set(cacheKey, {
      pages,
      scopes: tokens.scopes ?? [],
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Return pages WITHOUT access tokens (tokens stay server-side)
    const safePagesForClient = pages.map(({ accessToken: _tok, ...rest }) => ({
      ...rest,
      accessToken: "", // omitted for security — resolved from cache on select
    }));
    return { type: "multiple", pages: safePagesForClient, agencyId };
  }

  async connectFacebookPage(
    agencyId: string,
    page: {
      pageId: string;
      pageName: string;
      pageAccessToken?: string;
      pictureUrl?: string;
      followersCount?: number;
      category?: string;
    },
  ): Promise<SocialAccountPublic> {
    // Resolve page access token: use provided or look up from cache
    let pageAccessToken = page.pageAccessToken;
    // Granted scopes captured during the OAuth exchange (cached with the pages)
    // so we can record whether messaging (DM) permissions were granted.
    let grantedScopes: string[] = [];
    if (!pageAccessToken) {
      const cacheKey = `fb_pages_${agencyId}`;
      const cached = this.fbPagesCache.get(cacheKey);
      if (!cached || cached.expiresAt < Date.now()) {
        this.fbPagesCache.delete(cacheKey);
        throw new BadRequestException("Facebook page selection expired. Please reconnect.");
      }
      const cachedPage = cached.pages.find((p) => p.id === page.pageId);
      if (!cachedPage) {
        throw new BadRequestException("Selected page not found. Please reconnect.");
      }
      pageAccessToken = cachedPage.accessToken;
      grantedScopes = cached.scopes;
    }

    const encryptedAccessToken = this.encryption.encrypt(pageAccessToken);

    const account = await this.prisma.socialAccount.upsert({
      where: {
        agencyId_platform_platformUserId: {
          agencyId,
          platform: SocialPlatform.FACEBOOK,
          platformUserId: page.pageId,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        displayName: page.pageName,
        platformUsername: page.pageName,
        avatarUrl: page.pictureUrl ?? null,
        isActive: true,
        lastSyncedAt: new Date(),
        ...(grantedScopes.length > 0 ? { scopes: grantedScopes } : {}),
        metadata: {
          followersCount: page.followersCount ?? 0,
          category: page.category ?? "",
          type: "page",
        },
      },
      create: {
        agencyId,
        platform: SocialPlatform.FACEBOOK,
        platformUserId: page.pageId,
        platformUsername: page.pageName,
        displayName: page.pageName,
        avatarUrl: page.pictureUrl ?? null,
        accessToken: encryptedAccessToken,
        isActive: true,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
        scopes: grantedScopes,
        metadata: {
          followersCount: page.followersCount ?? 0,
          category: page.category ?? "",
          type: "page",
        },
      },
    });

    this.logger.log(
      `Facebook page connected: pageId=${page.pageId} name=${page.pageName} agencyId=${agencyId}`,
    );

    // Pull the account's recent posts immediately so dashboard/posts/analytics
    // have data right after connecting (otherwise every page stays empty until
    // the user manually opens the account detail page that auto-syncs).
    await this.autoSyncOnConnect(agencyId, account.id);

    return this.stripTokens(account);
  }

  // ---------------------------------------------------------------------------
  // Instagram account selection flow
  // ---------------------------------------------------------------------------

  async handleInstagramCallback(
    code: string,
    state: string,
  ): Promise<InstagramCallbackResult> {
    const { agencyId } = this.decodeState(state);

    const credentials = await this.oauthConfigService.getCredentials(
      SocialPlatform.INSTAGRAM,
    );

    if (!credentials) {
      throw new BadRequestException(
        "No OAuth credentials are configured for INSTAGRAM.",
      );
    }

    const connector = this.platformRegistry.getConnector(
      SocialPlatform.INSTAGRAM,
    ) as InstagramConnector;
    const redirectUri = this.buildRedirectUri(SocialPlatform.INSTAGRAM);

    const tokens = await connector.exchangeCode(code, redirectUri, credentials);
    const igAccounts = await connector.getInstagramAccounts(tokens.accessToken);

    this.logger.log(`Instagram accounts total: ${igAccounts.length} — ${igAccounts.map((a) => a.username).join(", ")}`);

    if (igAccounts.length === 0) {
      return { type: "none", agencyId };
    }

    // Store accounts with tokens in cache
    const cacheKey = `ig_accounts_${agencyId}`;
    const accountsWithTokens = igAccounts.map((a) => ({
      igId: a.igId,
      username: a.username,
      name: a.name,
      profilePictureUrl: a.profilePictureUrl,
      followersCount: a.followersCount,
      pageAccessToken: a.pageAccessToken,
    }));
    this.igAccountsCache.set(cacheKey, {
      accounts: accountsWithTokens,
      scopes: tokens.scopes ?? [],
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Return WITHOUT tokens
    const safeForClient = accountsWithTokens.map(({ pageAccessToken: _tok, ...rest }) => ({
      ...rest,
      pageAccessToken: "",
    }));
    return { type: "multiple", accounts: safeForClient, agencyId };
  }

  async connectInstagramAccount(
    agencyId: string,
    account: {
      igId: string;
      username?: string;
      name?: string;
      profilePictureUrl?: string;
      followersCount?: number;
    },
  ): Promise<SocialAccountPublic> {
    // Get token from cache
    const cacheKey = `ig_accounts_${agencyId}`;
    const cached = this.igAccountsCache.get(cacheKey);
    if (!cached || cached.expiresAt < Date.now()) {
      this.igAccountsCache.delete(cacheKey);
      throw new BadRequestException("Instagram account selection expired. Please reconnect.");
    }
    const cachedAccount = cached.accounts.find((a) => a.igId === account.igId);
    if (!cachedAccount) {
      throw new BadRequestException("Selected account not found. Please reconnect.");
    }

    const encryptedAccessToken = this.encryption.encrypt(cachedAccount.pageAccessToken);

    const saved = await this.prisma.socialAccount.upsert({
      where: {
        agencyId_platform_platformUserId: {
          agencyId,
          platform: SocialPlatform.INSTAGRAM,
          platformUserId: account.igId,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        displayName: account.name ?? account.username ?? null,
        platformUsername: account.username ?? null,
        avatarUrl: account.profilePictureUrl ?? null,
        isActive: true,
        lastSyncedAt: new Date(),
        ...(cached.scopes.length > 0 ? { scopes: cached.scopes } : {}),
        metadata: {
          followersCount: account.followersCount ?? 0,
          type: "business",
        },
      },
      create: {
        agencyId,
        platform: SocialPlatform.INSTAGRAM,
        platformUserId: account.igId,
        platformUsername: account.username ?? null,
        displayName: account.name ?? account.username ?? null,
        avatarUrl: account.profilePictureUrl ?? null,
        accessToken: encryptedAccessToken,
        isActive: true,
        connectedAt: new Date(),
        lastSyncedAt: new Date(),
        scopes: cached.scopes,
        metadata: {
          followersCount: account.followersCount ?? 0,
          type: "business",
        },
      },
    });

    this.logger.log(
      `Instagram account connected: igId=${account.igId} username=${account.username} agencyId=${agencyId}`,
    );

    // Pull recent media immediately so dashboard/posts/analytics have data
    // right after connecting (see connectFacebookPage for rationale).
    await this.autoSyncOnConnect(agencyId, saved.id);

    return this.stripTokens(saved);
  }

  /**
   * Best-effort post sync triggered right after an account is connected.
   * Failures are logged but never block the connection — the user can still
   * sync manually from the account detail page.
   */
  private async autoSyncOnConnect(
    agencyId: string,
    accountId: string,
  ): Promise<void> {
    try {
      const result = await this.syncFromPlatform(agencyId, accountId, true);
      this.logger.log(
        `Auto-sync on connect: ${result.synced} posts for account ${accountId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Auto-sync on connect failed for account ${accountId}: ${String(err)}`,
      );
    }
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
  // Assign to client (brand)
  // ---------------------------------------------------------------------------

  /**
   * Assigns a social account to a client (brand), or clears the assignment
   * when clientId is null. Both the account and the target client must belong
   * to the agency.
   */
  async assignClient(
    agencyId: string,
    accountId: string,
    clientId: string | null,
  ): Promise<SocialAccountPublic> {
    await this.assertExists(agencyId, accountId);

    if (clientId !== null) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, agencyId },
        select: { id: true },
      });
      if (!client) {
        throw new NotFoundException(`Client '${clientId}' not found in this agency`);
      }
    }

    const updated = await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { clientId },
    });

    return this.stripTokens(updated);
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

    // Deleting the account cascade-deletes its PostTargets. Synced posts that
    // were only attached to this account would otherwise be left orphaned
    // (PUBLISHED but with no platform). Clean them up in the same transaction.
    // Drafts/scheduled posts are preserved even when they have no targets,
    // since those are user-authored work-in-progress.
    const [, orphanCleanup] = await this.prisma.$transaction([
      this.prisma.socialAccount.delete({ where: { id: accountId } }),
      this.prisma.post.deleteMany({
        where: {
          agencyId,
          status: PostStatus.PUBLISHED,
          targets: { none: {} },
        },
      }),
    ]);

    this.logger.log(
      `Social account disconnected: id=${accountId} agencyId=${agencyId} — removed ${orphanCleanup.count} orphaned synced post(s)`,
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
    force = false,
  ): Promise<{ synced: number; message: string; skipped?: boolean }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, agencyId },
    });

    if (!account) {
      throw new NotFoundException(`Social account '${accountId}' not found`);
    }

    // Skip sync if last sync was less than 10 minutes ago (unless forced)
    if (!force && account.lastSyncedAt) {
      const elapsed = Date.now() - new Date(account.lastSyncedAt).getTime();
      if (elapsed < 10 * 60 * 1000) {
        return { synced: 0, message: "Recently synced — skipping", skipped: true };
      }
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
        // Instagram media endpoint requires the IG Business Account ID
        // First try directly with platformUserId, then fallback via /me/accounts
        let igUserId = account.platformUserId;

        // Try fetching media with stored platformUserId
        let url =
          `https://graph.facebook.com/v22.0/${igUserId}/media` +
          `?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count` +
          `&limit=25&access_token=${accessToken}`;
        let response = await fetch(url);

        // If that fails, try to resolve IG Business Account ID from /me/accounts
        if (!response.ok) {
          this.logger.log(`Direct IG media fetch failed (${response.status}), trying /me/accounts...`);
          const meUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=instagram_business_account{id}&access_token=${accessToken}`;
          const meResp = await fetch(meUrl);
          if (meResp.ok) {
            const meData = (await meResp.json()) as { data?: Array<{ instagram_business_account?: { id: string } }> };
            const igBizId = meData.data?.find(p => p.instagram_business_account)?.instagram_business_account?.id;
            if (igBizId && igBizId !== igUserId) {
              this.logger.log(`Found IG Business Account ID: ${igBizId} (was: ${igUserId})`);
              igUserId = igBizId;
              // Update stored platformUserId for future calls
              await this.prisma.socialAccount.update({
                where: { id: accountId },
                data: { platformUserId: igBizId },
              });
              // Retry with correct ID
              url =
                `https://graph.facebook.com/v22.0/${igBizId}/media` +
                `?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count` +
                `&limit=25&access_token=${accessToken}`;
              response = await fetch(url);
            }
          }
        }

        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (await response.json()) as { data?: any[] };
          posts = data.data ?? [];
          this.logger.log(`Instagram API returned ${posts.length} media items for account ${accountId}`);
          // Fetch comments for each post
          for (const post of posts) {
            try {
              const commResp = await fetch(
                `https://graph.facebook.com/v22.0/${post.id}/comments?fields=id,text,username,timestamp&limit=10&access_token=${accessToken}`,
              );
              if (commResp.ok) {
                const commData = (await commResp.json()) as { data?: Array<{ id: string; text: string; username?: string; timestamp: string }> };
                post._commentsList = (commData.data ?? []).map((c: { id: string; text: string; username?: string; timestamp: string }) => ({
                  id: c.id,
                  message: c.text,
                  from: { name: c.username ?? "User" },
                  created_time: c.timestamp,
                }));
                post.comments_count = commData.data?.length ?? post.comments_count ?? 0;
              }
            } catch {
              // Non-fatal
            }

            // Fetch view/reach insights for this media (impressions proxy).
            // Instagram renamed "impressions" to "views" in 2024; try both and
            // fall back to reach. Any failure is non-fatal — leaves it at 0.
            try {
              const insResp = await fetch(
                `https://graph.facebook.com/v22.0/${post.id}/insights?metric=views,reach&access_token=${accessToken}`,
              );
              if (insResp.ok) {
                const insData = (await insResp.json()) as {
                  data?: Array<{ name: string; values?: Array<{ value?: number }> }>;
                };
                const byName: Record<string, number> = {};
                for (const m of insData.data ?? []) {
                  byName[m.name] = m.values?.[0]?.value ?? 0;
                }
                post._impressions = byName["views"] ?? byName["reach"] ?? 0;
              }
            } catch {
              // Non-fatal — insights require instagram_manage_insights
            }
          }
        } else {
          const text = await response.text();
          this.logger.warn(
            `Instagram media fetch failed for account ${accountId}: ${response.status} ${text}`,
          );
          return { synced: 0, message: `Instagram API error: ${response.status}` };
        }
      } else if (platform === SocialPlatform.FACEBOOK) {
        const pageId = account.platformUserId;
        this.logger.log(`Facebook sync: pageId=${pageId}`);

        // Multiple strategies — all include engagement fields where possible
        const engagementFields = "id,message,created_time,full_picture,reactions.summary(true),comments.summary(true)";
        const basicFields = "id,message,created_time,full_picture";
        const strategies = [
          {
            label: "posts-query-engagement",
            url: `https://graph.facebook.com/v22.0/${pageId}/posts?fields=${engagementFields}&limit=25&access_token=${accessToken}`,
            useHeader: false,
          },
          {
            label: "posts-header-engagement",
            url: `https://graph.facebook.com/v22.0/${pageId}/posts?fields=${engagementFields}&limit=25`,
            useHeader: true,
          },
          {
            label: "posts-query-basic",
            url: `https://graph.facebook.com/v22.0/${pageId}/posts?fields=${basicFields}&limit=25&access_token=${accessToken}`,
            useHeader: false,
          },
          {
            label: "field-expansion",
            url: `https://graph.facebook.com/v22.0/${pageId}?fields=posts.limit(25){${basicFields}}&access_token=${accessToken}`,
            useHeader: false,
          },
        ];

        let fbPosts: any[] = [];
        for (const strategy of strategies) {
          this.logger.log(`Facebook sync strategy [${strategy.label}]`);
          const headers: Record<string, string> = {};
          if (strategy.useHeader) {
            headers["Authorization"] = `Bearer ${accessToken}`;
          }
          const resp = await fetch(strategy.url, { headers });
          if (resp.ok) {
            const data = await resp.json();
            // field-expansion returns {posts: {data: [...]}}
            fbPosts = data.posts?.data ?? data.data ?? [];
            this.logger.log(`Facebook sync [${strategy.label}] SUCCESS: ${fbPosts.length} posts`);
            break;
          } else {
            const errText = await resp.text();
            this.logger.warn(`Facebook sync [${strategy.label}] failed: ${resp.status} ${errText.substring(0, 200)}`);
          }
        }
        // Fetch engagement + comments per post (requires pages_read_engagement Advanced Access)
        for (const post of fbPosts) {
          if (post.reactions?.summary || post.like_count != null) continue;
          try {
            const engResp = await fetch(
              `https://graph.facebook.com/v22.0/${post.id}?fields=reactions.summary(true),comments.limit(10){id,message,from,created_time}&access_token=${accessToken}`,
            );
            if (engResp.ok) {
              const engData = (await engResp.json()) as {
                reactions?: { summary?: { total_count?: number } };
                comments?: { data?: Array<{ id: string; message: string; from?: { name: string; id: string }; created_time: string }> };
              };
              post.like_count = engData.reactions?.summary?.total_count ?? 0;
              post.comments_count = engData.comments?.data?.length ?? 0;
              post._commentsList = engData.comments?.data ?? [];
            }
          } catch {
            // Non-fatal — engagement requires Advanced Access
          }
        }

        posts = fbPosts;
        if (posts.length === 0) {
          this.logger.warn(`Facebook sync: all strategies failed for account ${accountId}`);
        }
      } else if (platform === SocialPlatform.TWITTER) {
        const url =
          `https://api.twitter.com/2/users/${account.platformUserId}/tweets` +
          `?max_results=20&exclude=retweets,replies` +
          `&tweet.fields=created_at,public_metrics,attachments` +
          `&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = (await response.json()) as { data?: any[]; includes?: { media?: any[] } };
          const mediaMap = new Map<string, { url?: string; preview_image_url?: string; type?: string }>();
          for (const m of data.includes?.media ?? []) {
            mediaMap.set(m.media_key, m);
          }
          posts = (data.data ?? []).map((t: any) => {
            const mediaKey = t.attachments?.media_keys?.[0];
            const media = mediaKey ? mediaMap.get(mediaKey) : undefined;
            return {
              id: t.id,
              caption: t.text,
              timestamp: t.created_at,
              like_count: t.public_metrics?.like_count,
              comments_count: t.public_metrics?.reply_count,
              media_url: media?.url ?? media?.preview_image_url ?? null,
              media_type: media?.type === "video" ? "VIDEO" : "IMAGE",
            };
          });
          this.logger.log(`Twitter API returned ${posts.length} tweets for account ${accountId}`);
        } else {
          const text = await response.text();
          this.logger.warn(`Twitter posts fetch failed for account ${accountId}: ${response.status} ${text}`);
          return { synced: 0, message: `Twitter API error: ${response.status}` };
        }
      } else if (platform === SocialPlatform.LINKEDIN) {
        const personUrn = `urn:li:person:${account.platformUserId}`;
        const strategies = [
          {
            label: "ugcPosts",
            url: `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(personUrn)})&count=25`,
            headers: { Authorization: `Bearer ${accessToken}` },
          },
          {
            label: "shares",
            url: `https://api.linkedin.com/v2/shares?q=owners&owners=${encodeURIComponent(personUrn)}&count=25`,
            headers: { Authorization: `Bearer ${accessToken}` },
          },
          {
            label: "rest-posts-v202401",
            url: `https://api.linkedin.com/rest/posts?author=${encodeURIComponent(personUrn)}&q=author&count=25`,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "LinkedIn-Version": "202401",
              "X-Restli-Protocol-Version": "2.0.0",
            },
          },
          {
            label: "rest-posts-v202605",
            url: `https://api.linkedin.com/rest/posts?author=${encodeURIComponent(personUrn)}&q=author&count=25`,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "LinkedIn-Version": "202605",
              "X-Restli-Protocol-Version": "2.0.0",
            },
          },
        ];

        for (const strategy of strategies) {
          this.logger.log(`LinkedIn sync strategy [${strategy.label}]`);
          try {
            const resp = await fetch(strategy.url, { headers: strategy.headers });
            if (resp.ok) {
              const data = await resp.json();
              const elements = (data as any).elements ?? (data as any).results ?? [];
              this.logger.log(`LinkedIn sync [${strategy.label}] SUCCESS: ${elements.length} posts`);

              posts = elements.map((el: any) => {
                // ugcPosts format
                const ugcText = el.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text;
                // shares format
                const shareText = el.text?.text;
                // rest/posts format
                const restText = el.commentary;

                const caption = ugcText ?? shareText ?? restText ?? "";
                const createdAt = el.created?.time ?? el.createdAt ?? el.publishedAt;
                const timestamp = createdAt
                  ? new Date(typeof createdAt === "number" ? createdAt : createdAt).toISOString()
                  : undefined;

                return {
                  id: el.id ?? el.urn ?? el.activity,
                  caption,
                  timestamp,
                  media_url: null,
                  media_type: "IMAGE",
                };
              });
              break;
            } else {
              const errText = await resp.text();
              this.logger.warn(`LinkedIn sync [${strategy.label}] failed: ${resp.status} ${errText.substring(0, 200)}`);
            }
          } catch (err) {
            this.logger.warn(`LinkedIn sync [${strategy.label}] error: ${String(err)}`);
          }
        }

        if (posts.length === 0) {
          this.logger.log(`LinkedIn: all post fetch strategies failed for account ${accountId}`);
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

      // Check if post already synced — update metrics if so
      const existing = await this.prisma.postTarget.findFirst({
        where: { platformPostId, socialAccountId: accountId },
      });
      if (existing) {
        // Update metrics on existing post
        const likes = (p.like_count as number | undefined) ?? (p.likes?.summary?.total_count as number | undefined) ?? (p.reactions?.summary?.total_count as number | undefined) ?? 0;
        const comments = (p.comments_count as number | undefined) ?? (p.comments?.summary?.total_count as number | undefined) ?? 0;
        const commentsList = (p._commentsList as Array<{ id: string; message: string; from?: { name: string }; created_time: string }> | undefined) ?? [];
        const impressions = (p._impressions as number | undefined) ?? 0;
        await this.prisma.postTarget.update({
          where: { id: existing.id },
          data: { platformSpecificContent: { likes, comments, impressions, commentsList } },
        });
        continue;
      }

      const captionText: string =
        ((p.caption as string | undefined) ?? (p.message as string | undefined) ?? "").slice(0, 2000);

      const rawTimestamp: string | undefined =
        (p.timestamp as string | undefined) ?? (p.created_time as string | undefined);
      const publishedAt = rawTimestamp ? new Date(rawTimestamp) : new Date();

      // Extract media URL from platform response
      const mediaUrl: string | null =
        (p.media_url as string | undefined) ??
        (p.thumbnail_url as string | undefined) ??
        (p.full_picture as string | undefined) ??
        null;
      const mediaType: string =
        (p.media_type as string | undefined) === "VIDEO" ? "VIDEO"
        : (p.media_type as string | undefined) === "CAROUSEL_ALBUM" ? "IMAGE"
        : "IMAGE";

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
                platformSpecificContent: {
                  likes: (p.like_count as number | undefined) ?? (p.likes?.summary?.total_count as number | undefined) ?? (p.reactions?.summary?.total_count as number | undefined) ?? 0,
                  comments: (p.comments_count as number | undefined) ?? (p.comments?.summary?.total_count as number | undefined) ?? 0,
                  impressions: (p._impressions as number | undefined) ?? 0,
                  commentsList: (p._commentsList as Array<{ id: string; message: string; from?: { name: string }; created_time: string }> | undefined) ?? [],
                },
              },
            },
            ...(mediaUrl ? {
              media: {
                create: {
                  mediaType: mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
                  url: mediaUrl,
                  thumbnailUrl: (p.thumbnail_url as string | undefined) ?? mediaUrl,
                  mimeType: mediaType === "VIDEO" ? "video/mp4" : "image/jpeg",
                  sortOrder: 0,
                },
              },
            } : {}),
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

    // Fetch profile stats (followers, following, posts count) for Instagram
    if (platform === SocialPlatform.INSTAGRAM) {
      try {
        const igUserId = (await this.prisma.socialAccount.findUnique({ where: { id: accountId } }))?.platformUserId;
        if (igUserId) {
          const profileUrl =
            `https://graph.facebook.com/v22.0/${igUserId}` +
            `?fields=followers_count,follows_count,media_count,biography,website` +
            `&access_token=${accessToken}`;
          const profileResp = await fetch(profileUrl);
          if (profileResp.ok) {
            const profileData = (await profileResp.json()) as {
              followers_count?: number;
              follows_count?: number;
              media_count?: number;
              biography?: string;
              website?: string;
            };
            const existingMeta = (typeof account.metadata === "object" && account.metadata !== null) ? account.metadata as Record<string, unknown> : {};
            await this.prisma.socialAccount.update({
              where: { id: accountId },
              data: {
                metadata: {
                  ...existingMeta,
                  followersCount: profileData.followers_count ?? 0,
                  followingCount: profileData.follows_count ?? 0,
                  postsCount: profileData.media_count ?? 0,
                  bio: profileData.biography ?? "",
                  website: profileData.website ?? "",
                },
              },
            });
            this.logger.log(
              `Instagram profile stats updated: followers=${profileData.followers_count} following=${profileData.follows_count} posts=${profileData.media_count}`,
            );
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Instagram profile stats: ${String(err)}`);
      }
    }

    // Fetch profile stats for Facebook pages (use Authorization header)
    if (platform === SocialPlatform.FACEBOOK) {
      try {
        const fbUrl =
          `https://graph.facebook.com/v22.0/${account.platformUserId}` +
          `?fields=followers_count,fan_count,name,category`;
        const fbResp = await fetch(fbUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (fbResp.ok) {
          const fbData = (await fbResp.json()) as {
            followers_count?: number;
            fan_count?: number;
            category?: string;
          };
          const existingMeta = (typeof account.metadata === "object" && account.metadata !== null) ? account.metadata as Record<string, unknown> : {};
          await this.prisma.socialAccount.update({
            where: { id: accountId },
            data: {
              metadata: {
                ...existingMeta,
                followersCount: fbData.followers_count ?? fbData.fan_count ?? 0,
                postsCount: posts?.length ?? 0,
                category: fbData.category ?? "",
              },
            },
          });
          this.logger.log(`Facebook profile stats updated: followers=${fbData.followers_count ?? fbData.fan_count}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Facebook profile stats: ${String(err)}`);
      }
    }

    // Fetch profile stats for Twitter
    if (platform === SocialPlatform.TWITTER) {
      try {
        const twResp = await fetch(
          `https://api.twitter.com/2/users/${account.platformUserId}?user.fields=public_metrics,description`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (twResp.ok) {
          const twData = (await twResp.json()) as {
            data?: {
              public_metrics?: { followers_count?: number; following_count?: number; tweet_count?: number };
              description?: string;
            };
          };
          const metrics = twData.data?.public_metrics;
          const existingMeta = (typeof account.metadata === "object" && account.metadata !== null) ? account.metadata as Record<string, unknown> : {};
          await this.prisma.socialAccount.update({
            where: { id: accountId },
            data: {
              metadata: {
                ...existingMeta,
                followersCount: metrics?.followers_count ?? 0,
                followingCount: metrics?.following_count ?? 0,
                postsCount: metrics?.tweet_count ?? 0,
                bio: twData.data?.description ?? "",
              },
            },
          });
          this.logger.log(`Twitter profile stats updated: followers=${metrics?.followers_count} following=${metrics?.following_count}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Twitter profile stats: ${String(err)}`);
      }
    }

    // Update LinkedIn profile stats
    if (platform === SocialPlatform.LINKEDIN) {
      try {
        const liProfileResp = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (liProfileResp.ok) {
          const liProfile = (await liProfileResp.json()) as {
            name?: string;
            picture?: string;
            email?: string;
          };
          const existingMeta = (typeof account.metadata === "object" && account.metadata !== null) ? account.metadata as Record<string, unknown> : {};

          // Try to fetch connection count
          let connectionsCount = 0;
          try {
            const connResp = await fetch(
              "https://api.linkedin.com/v2/connections?q=viewer&start=0&count=0",
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            if (connResp.ok) {
              const connData = (await connResp.json()) as { _total?: number; paging?: { total?: number } };
              connectionsCount = connData._total ?? connData.paging?.total ?? 0;
              this.logger.log(`LinkedIn connections count: ${connectionsCount}`);
            } else {
              this.logger.warn(`LinkedIn connections fetch failed: ${connResp.status}`);
            }
          } catch (err) {
            this.logger.warn(`LinkedIn connections fetch error: ${String(err)}`);
          }

          await this.prisma.socialAccount.update({
            where: { id: accountId },
            data: {
              displayName: liProfile.name ?? account.displayName,
              avatarUrl: liProfile.picture ?? account.avatarUrl,
              metadata: {
                ...existingMeta,
                email: liProfile.email ?? "",
                postsCount: posts.length,
                ...(connectionsCount > 0 ? { followersCount: connectionsCount, connectionsCount } : {}),
              },
            },
          });
          this.logger.log(`LinkedIn profile updated: name=${liProfile.name} connections=${connectionsCount}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch LinkedIn profile: ${String(err)}`);
      }
    }

    // Update lastSyncedAt
    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date() },
    });

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
