import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { SocialPlatform } from "@social-pro/prisma";

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

  constructor(private readonly prisma: PrismaService) {}

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

    const changes = entry["changes"];
    if (!Array.isArray(changes)) return;

    for (const change of changes as Record<string, unknown>[]) {
      const field = typeof change["field"] === "string" ? change["field"] : "";
      const value =
        change["value"] instanceof Object
          ? (change["value"] as Record<string, unknown>)
          : {};

      this.handleChange(field, value, pageId, socialAccount?.id ?? null);
    }

    // Instagram uses "messaging" array instead of changes
    const messaging = entry["messaging"];
    if (Array.isArray(messaging)) {
      this.logger.log(
        `facebook message events (${messaging.length}) — pageId=${pageId} accountId=${socialAccount?.id ?? "unknown"}`
      );
    }
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
