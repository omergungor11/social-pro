import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { SocialPlatform } from "@social-pro/prisma";

/**
 * TikTokWebhookHandler
 *
 * Processes inbound TikTok webhook events via the TikTok for Developers Events API.
 *
 * Supported event types (parsed from payload.event):
 *  - comment   — new comment on a video
 *  - like      — new like on a video
 *  - share     — video shared by a user
 *
 * TikTok webhook envelope shape:
 * {
 *   event: string,
 *   user_id?: string,
 *   open_id?: string,
 *   video_id?: string,
 *   comment?: { comment_id: string, text: string },
 * }
 */
@Injectable()
export class TikTokWebhookHandler {
  private readonly logger = new Logger(TikTokWebhookHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    try {
      const event =
        typeof payload["event"] === "string" ? payload["event"] : "";

      if (!event) {
        this.logger.warn("tiktok webhook: missing event field");
        return;
      }

      // TikTok uses open_id as the platform-specific account identifier
      const openId =
        typeof payload["open_id"] === "string" ? payload["open_id"] : null;

      const socialAccount = openId
        ? await this.findSocialAccount(openId)
        : null;

      this.dispatchEvent(event, payload, socialAccount?.id ?? null);
    } catch (err) {
      this.logger.error("Unhandled error in TikTokWebhookHandler.handle", err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private dispatchEvent(
    event: string,
    payload: Record<string, unknown>,
    socialAccountId: string | null
  ): void {
    const accountLabel = socialAccountId ?? "unknown";
    const videoId =
      typeof payload["video_id"] === "string"
        ? payload["video_id"]
        : String(payload["video_id"] ?? "unknown");

    switch (event) {
      case "comment": {
        const commentData = payload["comment"];
        const commentId =
          commentData instanceof Object
            ? String(
                (commentData as Record<string, unknown>)["comment_id"] ?? "unknown"
              )
            : "unknown";
        this.logger.log(
          `tiktok comment — videoId=${videoId} commentId=${commentId} account=${accountLabel}`
        );
        break;
      }
      case "like": {
        this.logger.log(
          `tiktok like — videoId=${videoId} account=${accountLabel}`
        );
        break;
      }
      case "share": {
        this.logger.log(
          `tiktok share — videoId=${videoId} account=${accountLabel}`
        );
        break;
      }
      default: {
        this.logger.debug(
          `tiktok unhandled event="${event}" account=${accountLabel}`
        );
      }
    }
  }

  private async findSocialAccount(openId: string) {
    if (!openId) return null;
    try {
      return await this.prisma.socialAccount.findFirst({
        where: { platform: "TIKTOK" as SocialPlatform, platformUserId: openId },
      });
    } catch (err) {
      this.logger.error(
        `tiktok: failed to look up social account for openId=${openId}`,
        err
      );
      return null;
    }
  }
}
