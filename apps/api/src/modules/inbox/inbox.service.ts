import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from "@nestjs/common";
import {
  InboxItem,
  InboxItemStatus,
  InboxItemType,
  Prisma,
  SocialAccount,
  SocialPlatform,
} from "@social-pro/prisma";
import type {
  InboxDeleteResult,
  PlatformActionResult,
  SocialPlatform as SharedSocialPlatform,
} from "@social-pro/shared-types";
import { PrismaService } from "../common/prisma/prisma.service";
import { EncryptionService } from "../social-account/services/encryption.service";
import {
  FetchedInboxItem,
  InboxAccount,
  PlatformInboxAdapter,
  ReplyResult,
} from "./adapters/inbox-adapter.interface";
import { FacebookInboxAdapter } from "./adapters/facebook.inbox";
import { InstagramInboxAdapter } from "./adapters/instagram.inbox";
import { TwitterInboxAdapter } from "./adapters/twitter.inbox";
import { LinkedInInboxAdapter } from "./adapters/linkedin.inbox";
import { TikTokInboxAdapter } from "./adapters/tiktok.inbox";

type InboxItemWithAccount = InboxItem & { socialAccount: SocialAccount };

export interface ListInboxFilters {
  status?: InboxItemStatus;
  type?: InboxItemType;
  platform?: SocialPlatform;
  socialAccountId?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}

export interface InboxItemDto {
  id: string;
  socialAccountId: string;
  platform: SocialPlatform;
  type: InboxItemType;
  status: InboxItemStatus;
  platformItemId: string;
  parentPlatformId: string | null;
  platformPostId: string | null;
  postId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  text: string | null;
  permalink: string | null;
  postPreviewText: string | null;
  postPreviewImageUrl: string | null;
  postPermalink: string | null;
  isOutbound: boolean;
  platformCreatedAt: string | null;
  createdAt: string;
  account?: {
    id: string;
    platform: SocialPlatform;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  replies?: InboxItemDto[];
}

/**
 * Orchestrates the unified social inbox: syncing interactions from each
 * platform, persisting them, listing/threading them for the UI, and dispatching
 * replies back to the originating platform.
 *
 * Tokens are decrypted per-operation and never cached.
 */
@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);
  private readonly adapters: Map<SocialPlatform, PlatformInboxAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly facebookAdapter: FacebookInboxAdapter,
    private readonly instagramAdapter: InstagramInboxAdapter,
    private readonly twitterAdapter: TwitterInboxAdapter,
    private readonly linkedInAdapter: LinkedInInboxAdapter,
    private readonly tiktokAdapter: TikTokInboxAdapter,
  ) {
    this.adapters = new Map<SocialPlatform, PlatformInboxAdapter>([
      [SocialPlatform.FACEBOOK, this.facebookAdapter],
      [SocialPlatform.INSTAGRAM, this.instagramAdapter],
      [SocialPlatform.TWITTER, this.twitterAdapter],
      [SocialPlatform.LINKEDIN, this.linkedInAdapter],
      [SocialPlatform.TIKTOK, this.tiktokAdapter],
    ]);
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  /**
   * Fetches new interactions for one account (or all active accounts of the
   * agency) and upserts them. Best-effort: a failing platform does not block
   * the others. Returns the number of newly stored items.
   */
  async sync(
    agencyId: string,
    accountId?: string,
    clientId?: string,
  ): Promise<{ synced: number; message: string }> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        agencyId,
        isActive: true,
        ...(accountId ? { id: accountId } : {}),
        ...(clientId ? { clientId } : {}),
        platform: { in: [...this.adapters.keys()] },
      },
    });

    if (accounts.length === 0) {
      if (accountId) throw new NotFoundException(`Social account '${accountId}' not found`);
      return { synced: 0, message: "No connected accounts to sync" };
    }

    let synced = 0;
    for (const account of accounts) {
      const adapter = this.adapters.get(account.platform);
      if (!adapter) continue;

      let inboxAccount: InboxAccount;
      try {
        inboxAccount = this.decryptAccount(account);
      } catch (err) {
        this.logger.warn(`Inbox sync: cannot decrypt token for ${account.id}: ${String(err)}`);
        continue;
      }

      let items: FetchedInboxItem[] = [];
      try {
        items = await adapter.fetchItems(inboxAccount);
      } catch (err) {
        this.logger.warn(
          `Inbox sync failed for ${account.platform} account ${account.id}: ${String(err)}`,
        );
        continue;
      }

      synced += await this.persistItems(agencyId, account, items);
    }

    return { synced, message: `Synced ${synced} new inbox items` };
  }

  /**
   * Upserts fetched items, returning how many were newly created.
   */
  private async persistItems(
    agencyId: string,
    account: SocialAccount,
    items: FetchedInboxItem[],
  ): Promise<number> {
    const incomingIds = items.map((i) => i.platformItemId).filter(Boolean);
    if (incomingIds.length === 0) return 0;

    // Pre-compute which ids already exist so we can report an accurate "new"
    // count without relying on fragile createdAt/updatedAt comparisons.
    const existing = await this.prisma.inboxItem.findMany({
      where: { socialAccountId: account.id, platformItemId: { in: incomingIds } },
      select: { platformItemId: true },
    });
    const existingIds = new Set(existing.map((e) => e.platformItemId));

    let created = 0;
    for (const item of items) {
      if (!item.platformItemId) continue;
      const isNew = !existingIds.has(item.platformItemId);
      try {
        await this.prisma.inboxItem.upsert({
          where: {
            socialAccountId_platformItemId: {
              socialAccountId: account.id,
              platformItemId: item.platformItemId,
            },
          },
          create: {
            agencyId,
            socialAccountId: account.id,
            platform: account.platform,
            type: item.type as InboxItemType,
            status: item.isOutbound ? InboxItemStatus.READ : InboxItemStatus.UNREAD,
            platformItemId: item.platformItemId,
            parentPlatformId: item.parentPlatformId ?? null,
            platformPostId: item.platformPostId ?? null,
            authorPlatformId: item.authorPlatformId ?? null,
            authorName: item.authorName ?? null,
            authorUsername: item.authorUsername ?? null,
            authorAvatarUrl: item.authorAvatarUrl ?? null,
            text: item.text ?? null,
            permalink: item.permalink ?? null,
            postPreviewText: item.postPreviewText ?? null,
            postPreviewImageUrl: item.postPreviewImageUrl ?? null,
            postPermalink: item.postPermalink ?? null,
            isOutbound: item.isOutbound ?? false,
            platformCreatedAt: item.platformCreatedAt ?? null,
            raw: (item.raw ?? {}) as Prisma.InputJsonValue,
          },
          // Refresh mutable display fields on re-sync (text/permalink + author
          // info, which can backfill once mapping improves); never resurrect a
          // read/replied status back to unread.
          update: {
            text: item.text ?? null,
            permalink: item.permalink ?? null,
            postPreviewText: item.postPreviewText ?? null,
            postPreviewImageUrl: item.postPreviewImageUrl ?? null,
            postPermalink: item.postPermalink ?? null,
            authorName: item.authorName ?? null,
            authorUsername: item.authorUsername ?? null,
            authorAvatarUrl: item.authorAvatarUrl ?? null,
          },
        });
        if (isNew) created += 1;
      } catch (err) {
        this.logger.debug(`Skipped inbox item ${item.platformItemId}: ${String(err)}`);
      }
    }
    return created;
  }

  /**
   * Public entry point for webhook-driven ingestion (e.g. real-time DMs and
   * comments arriving via platform webhooks). Persists items against the given
   * account, returning the number newly created. Best-effort: never throws.
   */
  async persistIncoming(
    account: SocialAccount,
    items: FetchedInboxItem[],
  ): Promise<number> {
    try {
      return await this.persistItems(account.agencyId, account, items);
    } catch (err) {
      this.logger.warn(`persistIncoming failed for account ${account.id}: ${String(err)}`);
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Read / list
  // ---------------------------------------------------------------------------

  async list(
    agencyId: string,
    filters: ListInboxFilters,
  ): Promise<{ data: InboxItemDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 25));

    const where: Prisma.InboxItemWhereInput = {
      agencyId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.platform ? { platform: filters.platform } : {}),
      ...(filters.socialAccountId ? { socialAccountId: filters.socialAccountId } : {}),
      ...(filters.clientId ? { socialAccount: { clientId: filters.clientId } } : {}),
      // Top-level inbox shows incoming interactions; our own replies appear
      // nested under their parent in the thread view.
      isOutbound: false,
    };

    const [rows, total] = await Promise.all([
      this.prisma.inboxItem.findMany({
        where,
        include: { socialAccount: true },
        orderBy: [{ platformCreatedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inboxItem.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toDto(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * Returns a single item with its threaded replies (ours + the audience's).
   */
  async getThread(agencyId: string, itemId: string): Promise<InboxItemDto> {
    const item = await this.prisma.inboxItem.findFirst({
      where: { id: itemId, agencyId },
      include: { socialAccount: true },
    });
    if (!item) throw new NotFoundException(`Inbox item '${itemId}' not found`);

    const replies = await this.prisma.inboxItem.findMany({
      where: { agencyId, parentPlatformId: item.platformItemId },
      include: { socialAccount: true },
      orderBy: [{ platformCreatedAt: "asc" }, { createdAt: "asc" }],
    });

    return { ...this.toDto(item), replies: replies.map((r) => this.toDto(r)) };
  }

  async getStats(
    agencyId: string,
    clientId?: string,
  ): Promise<{
    total: number;
    unread: number;
    byPlatform: Array<{ platform: SocialPlatform; total: number; unread: number }>;
    byType: Array<{ type: InboxItemType; total: number; unread: number }>;
  }> {
    const base: Prisma.InboxItemWhereInput = {
      agencyId,
      isOutbound: false,
      ...(clientId ? { socialAccount: { clientId } } : {}),
    };
    const [total, unread, byPlatformRaw, byTypeRaw] = await Promise.all([
      this.prisma.inboxItem.count({ where: base }),
      this.prisma.inboxItem.count({ where: { ...base, status: InboxItemStatus.UNREAD } }),
      this.prisma.inboxItem.groupBy({ by: ["platform"], where: base, _count: { _all: true } }),
      this.prisma.inboxItem.groupBy({ by: ["type"], where: base, _count: { _all: true } }),
    ]);

    // Unread counts per dimension (separate grouped query keeps it simple).
    const unreadByPlatform = await this.prisma.inboxItem.groupBy({
      by: ["platform"],
      where: { ...base, status: InboxItemStatus.UNREAD },
      _count: { _all: true },
    });
    const unreadByType = await this.prisma.inboxItem.groupBy({
      by: ["type"],
      where: { ...base, status: InboxItemStatus.UNREAD },
      _count: { _all: true },
    });
    const upMap = new Map(unreadByPlatform.map((r) => [r.platform, r._count._all]));
    const utMap = new Map(unreadByType.map((r) => [r.type, r._count._all]));

    return {
      total,
      unread,
      byPlatform: byPlatformRaw.map((r) => ({
        platform: r.platform,
        total: r._count._all,
        unread: upMap.get(r.platform) ?? 0,
      })),
      byType: byTypeRaw.map((r) => ({
        type: r.type,
        total: r._count._all,
        unread: utMap.get(r.type) ?? 0,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  async markStatus(
    agencyId: string,
    itemId: string,
    status: InboxItemStatus,
  ): Promise<InboxItemDto> {
    await this.assertExists(agencyId, itemId);
    const updated = await this.prisma.inboxItem.update({
      where: { id: itemId },
      data: { status },
      include: { socialAccount: true },
    });
    return this.toDto(updated);
  }

  /**
   * Posts a reply to the platform and records it as an outbound inbox item
   * threaded under the original. Marks the parent REPLIED.
   */
  async reply(agencyId: string, itemId: string, text: string): Promise<InboxItemDto> {
    const body = text?.trim();
    if (!body) throw new BadRequestException("Reply text is required");

    const item = await this.prisma.inboxItem.findFirst({
      where: { id: itemId, agencyId },
      include: { socialAccount: true },
    });
    if (!item) throw new NotFoundException(`Inbox item '${itemId}' not found`);

    const adapter = this.adapters.get(item.platform);
    if (!adapter) {
      throw new BadRequestException(`Replies are not supported for ${item.platform}`);
    }
    if (!adapter.canReply) {
      throw new BadRequestException(
        `Replying on ${item.platform} is not available with the current API access.`,
      );
    }

    const account = this.decryptAccount(item.socialAccount);
    let result: ReplyResult;
    try {
      result = await adapter.reply(item.platformItemId, body, account, {
        type: item.type,
        platformPostId: item.platformPostId,
        authorPlatformId: item.authorPlatformId,
      });
    } catch (err) {
      // The platform call failed (expired token, closed 24h messaging window,
      // unresolvable page id, invalid recipient, etc). Surface the real reason
      // as a 502 instead of letting a plain Error become an opaque 500.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Reply to ${item.platform} item ${item.id} failed: ${reason}`,
      );
      throw new BadGatewayException(reason);
    }

    const [outbound] = await this.prisma.$transaction([
      this.prisma.inboxItem.create({
        data: {
          agencyId,
          socialAccountId: item.socialAccountId,
          platform: item.platform,
          type: InboxItemType.REPLY,
          status: InboxItemStatus.READ,
          platformItemId: result.platformItemId,
          parentPlatformId: item.platformItemId,
          platformPostId: item.platformPostId,
          authorPlatformId: item.socialAccount.platformUserId,
          authorName: item.socialAccount.displayName,
          authorUsername: item.socialAccount.platformUsername,
          authorAvatarUrl: item.socialAccount.avatarUrl,
          text: body,
          permalink: result.permalink ?? null,
          isOutbound: true,
          platformCreatedAt: result.createdAt ?? null,
        },
        include: { socialAccount: true },
      }),
      this.prisma.inboxItem.update({
        where: { id: item.id },
        data: { status: InboxItemStatus.REPLIED },
      }),
    ]);

    return this.toDto(outbound);
  }

  /**
   * Deletes an interaction from the platform (best-effort) and locally. If the
   * platform doesn't support deletion or the platform call fails, the item is
   * still removed locally — mirroring the post-delete pattern.
   */
  async deleteItem(agencyId: string, itemId: string): Promise<InboxDeleteResult> {
    const item = await this.prisma.inboxItem.findFirst({
      where: { id: itemId, agencyId },
      include: { socialAccount: true },
    });
    if (!item) throw new NotFoundException(`Inbox item '${itemId}' not found`);

    const adapter = this.adapters.get(item.platform);
    const sharedPlatform = item.platform as unknown as SharedSocialPlatform;

    let platform: PlatformActionResult;
    if (!adapter || !adapter.canDelete || !adapter.deleteItem) {
      platform = {
        platform: sharedPlatform,
        success: false,
        supported: false,
        message: `Deleting on ${item.platform} is not supported.`,
      };
    } else {
      const account = this.decryptAccount(item.socialAccount);
      try {
        await adapter.deleteItem(item.platformItemId, account, {
          type: item.type,
          platformPostId: item.platformPostId,
        });
        platform = { platform: sharedPlatform, success: true, supported: true };
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Delete on ${item.platform} item ${item.id} failed: ${reason}`,
        );
        platform = {
          platform: sharedPlatform,
          success: false,
          supported: true,
          message: reason,
        };
      }
    }

    // Best-effort local cleanup: remove threaded replies, then the item itself.
    try {
      await this.prisma.inboxItem.deleteMany({
        where: {
          socialAccountId: item.socialAccountId,
          parentPlatformId: item.platformItemId,
        },
      });
    } catch (err) {
      this.logger.debug(
        `Failed to delete replies for inbox item ${item.id}: ${String(err)}`,
      );
    }
    await this.prisma.inboxItem.delete({ where: { id: item.id } });

    return { deleted: true, platform };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async assertExists(agencyId: string, itemId: string): Promise<void> {
    const exists = await this.prisma.inboxItem.findFirst({
      where: { id: itemId, agencyId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Inbox item '${itemId}' not found`);
  }

  private decryptAccount(account: SocialAccount): InboxAccount {
    return {
      id: account.id,
      platform: account.platform,
      platformUserId: account.platformUserId,
      platformUsername: account.platformUsername,
      accessToken: this.encryption.decrypt(account.accessToken),
      refreshToken: account.refreshToken ? this.encryption.decrypt(account.refreshToken) : null,
      metadata: (account.metadata as Record<string, unknown>) ?? {},
    };
  }

  private toDto(item: InboxItemWithAccount): InboxItemDto {
    return {
      id: item.id,
      socialAccountId: item.socialAccountId,
      platform: item.platform,
      type: item.type,
      status: item.status,
      platformItemId: item.platformItemId,
      parentPlatformId: item.parentPlatformId,
      platformPostId: item.platformPostId,
      postId: item.postId,
      authorName: item.authorName,
      authorUsername: item.authorUsername,
      authorAvatarUrl: item.authorAvatarUrl,
      text: item.text,
      permalink: item.permalink,
      postPreviewText: item.postPreviewText,
      postPreviewImageUrl: item.postPreviewImageUrl,
      postPermalink: item.postPermalink,
      isOutbound: item.isOutbound,
      platformCreatedAt: item.platformCreatedAt ? item.platformCreatedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      account: {
        id: item.socialAccount.id,
        platform: item.socialAccount.platform,
        displayName: item.socialAccount.displayName,
        username: item.socialAccount.platformUsername,
        avatarUrl: item.socialAccount.avatarUrl,
      },
    };
  }
}
