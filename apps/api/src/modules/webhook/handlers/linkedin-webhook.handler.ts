import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import type { SocialPlatform } from "@social-pro/prisma";

/**
 * LinkedInWebhookHandler
 *
 * Processes inbound LinkedIn webhook events via the LinkedIn Events API.
 *
 * Supported event types (parsed from payload.eventType):
 *  - SHARE_CREATED               — new share / post published
 *  - COMMENT_CREATED             — new comment on a share
 *  - COMMENT_UPDATED             — comment edited
 *  - REACTION_CREATED            — reaction (like) on a share or comment
 *  - MEMBER_ORGANIZATION_STATUS  — membership / account status change
 *
 * LinkedIn envelope shape:
 * {
 *   eventType: string,
 *   organizationUrn?: string,
 *   memberUrn?: string,
 *   shareUrn?: string,
 *   actor?: { urn: string },
 * }
 */
@Injectable()
export class LinkedInWebhookHandler {
  private readonly logger = new Logger(LinkedInWebhookHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    try {
      const eventType =
        typeof payload["eventType"] === "string" ? payload["eventType"] : "";

      if (!eventType) {
        this.logger.warn("linkedin webhook: missing eventType field");
        return;
      }

      const organizationUrn =
        typeof payload["organizationUrn"] === "string"
          ? payload["organizationUrn"]
          : null;

      const platformUserId = organizationUrn
        ? this.extractUrnId(organizationUrn)
        : null;

      const socialAccount = platformUserId
        ? await this.findSocialAccount(platformUserId)
        : null;

      this.dispatchEvent(eventType, payload, socialAccount?.id ?? null);
    } catch (err) {
      this.logger.error("Unhandled error in LinkedInWebhookHandler.handle", err);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private dispatchEvent(
    eventType: string,
    payload: Record<string, unknown>,
    socialAccountId: string | null
  ): void {
    const accountLabel = socialAccountId ?? "unknown";

    switch (eventType) {
      case "SHARE_CREATED": {
        const shareUrn = typeof payload["shareUrn"] === "string" ? payload["shareUrn"] : "";
        this.logger.log(
          `linkedin SHARE_CREATED — shareUrn=${shareUrn} account=${accountLabel}`
        );
        break;
      }
      case "COMMENT_CREATED":
      case "COMMENT_UPDATED": {
        const commentUrn =
          typeof payload["commentUrn"] === "string" ? payload["commentUrn"] : "";
        this.logger.log(
          `linkedin ${eventType} — commentUrn=${commentUrn} account=${accountLabel}`
        );
        break;
      }
      case "REACTION_CREATED": {
        const reactionType =
          typeof payload["reactionType"] === "string"
            ? payload["reactionType"]
            : "unknown";
        this.logger.log(
          `linkedin REACTION_CREATED — type=${reactionType} account=${accountLabel}`
        );
        break;
      }
      case "MEMBER_ORGANIZATION_STATUS": {
        const status =
          typeof payload["status"] === "string" ? payload["status"] : "unknown";
        this.logger.log(
          `linkedin MEMBER_ORGANIZATION_STATUS — status=${status} account=${accountLabel}`
        );
        break;
      }
      default: {
        this.logger.debug(
          `linkedin unhandled eventType="${eventType}" account=${accountLabel}`
        );
      }
    }
  }

  /**
   * Extracts the numeric/string ID from a LinkedIn URN.
   * Example: "urn:li:organization:12345678" → "12345678"
   */
  private extractUrnId(urn: string): string | null {
    const parts = urn.split(":");
    return parts.length > 0 ? (parts[parts.length - 1] ?? null) : null;
  }

  private async findSocialAccount(platformUserId: string) {
    if (!platformUserId) return null;
    try {
      return await this.prisma.socialAccount.findFirst({
        where: { platform: "LINKEDIN" as SocialPlatform, platformUserId },
      });
    } catch (err) {
      this.logger.error(
        `linkedin: failed to look up social account for platformUserId=${platformUserId}`,
        err
      );
      return null;
    }
  }
}
