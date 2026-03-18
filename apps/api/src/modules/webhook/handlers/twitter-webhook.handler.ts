import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { SocialPlatform } from "@social-pro/prisma";

/**
 * TwitterWebhookHandler
 *
 * Processes inbound Twitter Account Activity API webhook events.
 *
 * Supported event types:
 *  - tweet_create_events   — new tweets / replies / mentions
 *  - favorite_events       — tweet liked
 *  - follow_events         — new follower
 *
 * Payload shapes are intentionally unknown at compile time; all access
 * uses optional chaining and type narrowing to avoid runtime throws.
 */
@Injectable()
export class TwitterWebhookHandler {
  private readonly logger = new Logger(TwitterWebhookHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    try {
      await this.processTweetCreateEvents(payload);
      await this.processFavoriteEvents(payload);
      await this.processFollowEvents(payload);
    } catch (err) {
      this.logger.error("Unhandled error in TwitterWebhookHandler.handle", err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async processTweetCreateEvents(
    payload: Record<string, unknown>
  ): Promise<void> {
    const events = payload["tweet_create_events"];
    if (!Array.isArray(events) || events.length === 0) return;

    const forUserId = payload["for_user_id"];
    const platformUserId =
      typeof forUserId === "string" ? forUserId : String(forUserId ?? "");

    if (!platformUserId) {
      this.logger.warn("twitter tweet_create_events: missing for_user_id");
      return;
    }

    const socialAccount = await this.findSocialAccount(platformUserId);
    if (!socialAccount) return;

    for (const event of events as Record<string, unknown>[]) {
      const tweetId = event["id_str"] ?? event["id"];
      const authorId = (event["user"] as Record<string, unknown> | undefined)?.[
        "id_str"
      ];
      const isReply = Boolean(event["in_reply_to_user_id"]);
      const isMention = authorId !== platformUserId;

      const eventLabel = isReply
        ? "reply"
        : isMention
          ? "mention"
          : "tweet_create";

      this.logger.log(
        `twitter ${eventLabel} — account=${socialAccount.id} tweet=${String(tweetId ?? "unknown")}`
      );
    }
  }

  private async processFavoriteEvents(
    payload: Record<string, unknown>
  ): Promise<void> {
    const events = payload["favorite_events"];
    if (!Array.isArray(events) || events.length === 0) return;

    const forUserId = payload["for_user_id"];
    const platformUserId =
      typeof forUserId === "string" ? forUserId : String(forUserId ?? "");

    const socialAccount = await this.findSocialAccount(platformUserId);
    if (!socialAccount) return;

    this.logger.log(
      `twitter favorite_events (${events.length}) — account=${socialAccount.id}`
    );
  }

  private async processFollowEvents(
    payload: Record<string, unknown>
  ): Promise<void> {
    const events = payload["follow_events"];
    if (!Array.isArray(events) || events.length === 0) return;

    const forUserId = payload["for_user_id"];
    const platformUserId =
      typeof forUserId === "string" ? forUserId : String(forUserId ?? "");

    const socialAccount = await this.findSocialAccount(platformUserId);
    if (!socialAccount) return;

    this.logger.log(
      `twitter follow_events (${events.length}) — account=${socialAccount.id}`
    );
  }

  private async findSocialAccount(platformUserId: string) {
    if (!platformUserId) return null;
    try {
      return await this.prisma.socialAccount.findFirst({
        where: { platform: "TWITTER" as SocialPlatform, platformUserId },
      });
    } catch (err) {
      this.logger.error(
        `twitter: failed to look up social account for platformUserId=${platformUserId}`,
        err
      );
      return null;
    }
  }
}
