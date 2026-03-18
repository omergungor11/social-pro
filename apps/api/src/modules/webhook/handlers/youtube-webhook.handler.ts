import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { SocialPlatform } from "@social-pro/prisma";

/**
 * YouTubeWebhookHandler
 *
 * Processes inbound YouTube PubSubHubbub (WebSub) notifications.
 *
 * YouTube sends Atom XML payloads; this handler receives the pre-parsed
 * body as a string (stored under payload.rawXml) by the controller, plus
 * the parsed fields extracted via simple regex-based parsing to avoid
 * an xml2js dependency.
 *
 * Supported notifications:
 *  - Video published  — <yt:videoId> present in Atom feed
 *  - Video deleted    — <at:deleted-entry> in Atom feed
 *
 * The payload shape passed in from the controller:
 * {
 *   rawXml: string,        // full Atom XML body
 *   channelId?: string,    // extracted yt:channelId
 *   videoId?: string,      // extracted yt:videoId
 *   isDeleted?: boolean,   // true when <at:deleted-entry> detected
 * }
 */
@Injectable()
export class YouTubeWebhookHandler {
  private readonly logger = new Logger(YouTubeWebhookHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    try {
      // The controller passes pre-extracted fields alongside rawXml
      const channelId =
        typeof payload["channelId"] === "string" ? payload["channelId"] : null;
      const videoId =
        typeof payload["videoId"] === "string" ? payload["videoId"] : null;
      const isDeleted = payload["isDeleted"] === true;

      if (!channelId && !videoId) {
        this.logger.warn(
          "youtube webhook: could not extract channelId or videoId from payload"
        );
        return;
      }

      const socialAccount = channelId
        ? await this.findSocialAccount(channelId)
        : null;

      const accountLabel = socialAccount?.id ?? "unknown";

      if (isDeleted) {
        this.logger.log(
          `youtube video_deleted — videoId=${videoId ?? "unknown"} channelId=${channelId ?? "unknown"} account=${accountLabel}`
        );
      } else if (videoId) {
        this.logger.log(
          `youtube video_published — videoId=${videoId} channelId=${channelId ?? "unknown"} account=${accountLabel}`
        );
      }
    } catch (err) {
      this.logger.error("Unhandled error in YouTubeWebhookHandler.handle", err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findSocialAccount(channelId: string) {
    if (!channelId) return null;
    try {
      return await this.prisma.socialAccount.findFirst({
        where: { platform: "YOUTUBE" as SocialPlatform, platformUserId: channelId },
      });
    } catch (err) {
      this.logger.error(
        `youtube: failed to look up social account for channelId=${channelId}`,
        err
      );
      return null;
    }
  }
}
