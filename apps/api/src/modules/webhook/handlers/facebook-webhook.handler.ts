import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { SocialAccount, SocialPlatform } from "@social-pro/prisma";
import { InboxService } from "../../inbox/inbox.service";
import type { FetchedInboxItem } from "../../inbox/adapters/inbox-adapter.interface";

/**
 * FacebookWebhookHandler
 *
 * Processes inbound Facebook / Instagram Graph API webhook events.
 *
 * Supported event types (parsed from entry[].changes[].field):
 *  - feed      — page feed updates (posts, comments)
 *  - mention   — page mentions
 *  - messages  — Messenger messages
 *
 * The payload structure follows the standard Facebook webhook envelope:
 * { object: string, entry: [{ id, changes: [{ field, value }] }] }
 */
@Injectable()
export class FacebookWebhookHandler {
  private readonly logger = new Logger(FacebookWebhookHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxService: InboxService
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    try {
      const entries = payload["entry"];
      if (!Array.isArray(entries)) {
        this.logger.warn("facebook webhook: no entry array in payload");
        return;
      }

      for (const entry of entries as Record<string, unknown>[]) {
        await this.processEntry(entry, String(payload["object"] ?? "page"));
      }
    } catch (err) {
      this.logger.error("Unhandled error in FacebookWebhookHandler.handle", err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async processEntry(
    entry: Record<string, unknown>,
    objectType: string
  ): Promise<void> {
    const pageId = typeof entry["id"] === "string" ? entry["id"] : String(entry["id"] ?? "");
    if (!pageId) return;

    const socialAccount = await this.findSocialAccount(pageId, objectType);

    const items: FetchedInboxItem[] = [];

    const changes = entry["changes"];
    if (Array.isArray(changes)) {
      for (const change of changes as Record<string, unknown>[]) {
        const field = typeof change["field"] === "string" ? change["field"] : "";
        const value =
          change["value"] instanceof Object
            ? (change["value"] as Record<string, unknown>)
            : {};

        this.handleChange(field, value, pageId, socialAccount?.id ?? null);

        const commentItem = this.buildCommentItem(field, value);
        if (commentItem) items.push(commentItem);
      }
    }

    // Messenger DMs arrive in the "messaging" array (Facebook + Instagram)
    const messaging = entry["messaging"];
    if (Array.isArray(messaging)) {
      this.logger.log(
        `facebook message events (${messaging.length}) — pageId=${pageId} accountId=${socialAccount?.id ?? "unknown"}`
      );
      for (const event of messaging as Record<string, unknown>[]) {
        const dmItem = this.buildDirectMessageItem(event, pageId);
        if (dmItem) items.push(dmItem);
      }
    }

    if (socialAccount && items.length > 0) {
      await this.persist(socialAccount, items);
    }
  }

  private async persist(
    socialAccount: SocialAccount,
    items: FetchedInboxItem[]
  ): Promise<void> {
    try {
      const created = await this.inboxService.persistIncoming(socialAccount, items);
      this.logger.log(
        `facebook webhook persisted ${created}/${items.length} inbox item(s) for account=${socialAccount.id}`
      );
    } catch (err) {
      this.logger.warn(
        `facebook webhook: failed to persist inbox items for account=${socialAccount.id}: ${String(err)}`
      );
    }
  }

  private buildDirectMessageItem(
    event: Record<string, unknown>,
    pageId: string
  ): FetchedInboxItem | null {
    const message =
      event["message"] instanceof Object
        ? (event["message"] as Record<string, unknown>)
        : null;
    if (!message) return null;

    const mid = typeof message["mid"] === "string" ? message["mid"] : null;
    const text = typeof message["text"] === "string" ? message["text"] : null;
    if (!mid || !text) return null;

    const sender =
      event["sender"] instanceof Object
        ? (event["sender"] as Record<string, unknown>)
        : null;
    const senderId = sender && typeof sender["id"] === "string" ? sender["id"] : null;

    const timestamp =
      typeof event["timestamp"] === "number" ? event["timestamp"] : null;

    return {
      platformItemId: mid,
      type: "DIRECT_MESSAGE",
      parentPlatformId: senderId,
      authorPlatformId: senderId,
      text,
      isOutbound: senderId !== null && senderId === pageId,
      platformCreatedAt: timestamp !== null ? new Date(timestamp) : null,
      raw: event,
    };
  }

  private buildCommentItem(
    field: string,
    value: Record<string, unknown>
  ): FetchedInboxItem | null {
    if (field !== "feed") return null;
    if (value["item"] !== "comment") return null;

    const verb = typeof value["verb"] === "string" ? value["verb"] : "";
    if (verb !== "add" && verb !== "create") return null;

    const commentId =
      typeof value["comment_id"] === "string" ? value["comment_id"] : null;
    if (!commentId) return null;

    const from =
      value["from"] instanceof Object
        ? (value["from"] as Record<string, unknown>)
        : null;

    return {
      platformItemId: commentId,
      type: "COMMENT",
      platformPostId:
        typeof value["post_id"] === "string" ? value["post_id"] : null,
      parentPlatformId:
        typeof value["parent_id"] === "string" ? value["parent_id"] : null,
      authorPlatformId: from && typeof from["id"] === "string" ? from["id"] : null,
      authorName: from && typeof from["name"] === "string" ? from["name"] : null,
      text: typeof value["message"] === "string" ? value["message"] : null,
      platformCreatedAt: this.parseCommentCreatedAt(value["created_time"]),
      raw: value,
    };
  }

  private parseCommentCreatedAt(raw: unknown): Date | null {
    if (typeof raw === "number") return new Date(raw * 1000);
    if (typeof raw === "string") {
      const date = new Date(raw);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private handleChange(
    field: string,
    value: Record<string, unknown>,
    pageId: string,
    socialAccountId: string | null
  ): void {
    const accountLabel = socialAccountId ?? "unknown";

    switch (field) {
      case "feed": {
        const itemId = value["post_id"] ?? value["comment_id"] ?? value["reaction_user_id"];
        const verbRaw = value["verb"];
        const verb = typeof verbRaw === "string" ? verbRaw : "unknown";
        this.logger.log(
          `facebook feed change — verb=${verb} item=${String(itemId ?? "unknown")} pageId=${pageId} account=${accountLabel}`
        );
        break;
      }
      case "mention": {
        const postId = value["post_id"] ?? value["comment_id"];
        this.logger.log(
          `facebook mention — postId=${String(postId ?? "unknown")} pageId=${pageId} account=${accountLabel}`
        );
        break;
      }
      case "messages": {
        this.logger.log(
          `facebook messages event — pageId=${pageId} account=${accountLabel}`
        );
        break;
      }
      default: {
        this.logger.debug(
          `facebook unhandled field="${field}" pageId=${pageId} account=${accountLabel}`
        );
      }
    }
  }

  private async findSocialAccount(pageId: string, objectType: string) {
    if (!pageId) return null;

    // Instagram webhooks arrive with object="instagram"; Facebook with object="page"
    const platform: SocialPlatform =
      objectType === "instagram" ? "INSTAGRAM" : "FACEBOOK";

    try {
      return await this.prisma.socialAccount.findFirst({
        where: { platform, platformUserId: pageId },
      });
    } catch (err) {
      this.logger.error(
        `facebook: failed to look up social account for pageId=${pageId} platform=${platform}`,
        err
      );
      return null;
    }
  }
}
