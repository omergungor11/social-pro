import { Injectable, Logger } from "@nestjs/common";
import { Post, PostMedia, PostTarget, SocialAccount, SocialPlatform } from "@social-pro/prisma";
import {
  PlatformActionResult,
  SocialPlatform as SharedSocialPlatform,
} from "@social-pro/shared-types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EncryptionService } from "../../social-account/services/encryption.service";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
} from "./adapters/publisher-adapter.interface";
import { TwitterPublisher } from "./adapters/twitter.publisher";
import { FacebookPublisher } from "./adapters/facebook.publisher";
import { InstagramPublisher } from "./adapters/instagram.publisher";
import { LinkedInPublisher } from "./adapters/linkedin.publisher";
import { TikTokPublisher } from "./adapters/tiktok.publisher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostWithRelations = Post & {
  media: PostMedia[];
  targets: Array<PostTarget & { socialAccount: SocialAccount }>;
};

export interface PublishTargetResult {
  targetId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Orchestrates publishing a post across all its target social accounts.
 *
 * Each target is published independently — a failure on one platform does not
 * block others. Per-target `PostTarget` rows are updated with the result.
 *
 * Tokens are decrypted per-request and never cached.
 */
@Injectable()
export class PublisherService {
  private readonly logger = new Logger(PublisherService.name);
  private readonly adapters: Map<SocialPlatform, PlatformPublisher>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly twitterPublisher: TwitterPublisher,
    private readonly facebookPublisher: FacebookPublisher,
    private readonly instagramPublisher: InstagramPublisher,
    private readonly linkedInPublisher: LinkedInPublisher,
    private readonly tiktokPublisher: TikTokPublisher
  ) {
    this.adapters = new Map<SocialPlatform, PlatformPublisher>([
      [SocialPlatform.TWITTER, this.twitterPublisher],
      [SocialPlatform.FACEBOOK, this.facebookPublisher],
      [SocialPlatform.INSTAGRAM, this.instagramPublisher],
      [SocialPlatform.LINKEDIN, this.linkedInPublisher],
      [SocialPlatform.TIKTOK, this.tiktokPublisher],
    ]);
  }

  /**
   * Publishes the post to all of its pending targets.
   *
   * @param post Fully loaded post including targets and media
   */
  async publish(post: PostWithRelations): Promise<PublishTargetResult[]> {
    const pendingTargets = post.targets.filter(
      (t) => t.status === "PENDING" || t.status === "PUBLISHING"
    );

    if (pendingTargets.length === 0) {
      this.logger.warn(`No pending targets for post ${post.id}`);
      return [];
    }

    // Mark all pending targets as PUBLISHING
    await this.prisma.postTarget.updateMany({
      where: { postId: post.id, status: { in: ["PENDING", "PUBLISHING"] } },
      data: { status: "PUBLISHING" },
    });

    const content = this.buildContent(post);

    const results = await Promise.allSettled(
      pendingTargets.map((target) => this.publishToTarget(target, content))
    );

    const targetResults: PublishTargetResult[] = results.map((result, index) => {
      const target = pendingTargets[index]!;

      if (result.status === "fulfilled") {
        return result.value;
      }

      return {
        targetId: target.id,
        socialAccountId: target.socialAccountId,
        platform: target.socialAccount.platform,
        success: false,
        errorMessage: result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
      };
    });

    // Count successes / failures to set overall post status
    const allSucceeded = targetResults.every((r) => r.success);
    const allFailed = targetResults.every((r) => !r.success);

    await this.prisma.post.update({
      where: { id: post.id },
      data: {
        status: allSucceeded ? "PUBLISHED" : allFailed ? "FAILED" : "PUBLISHED",
        publishedAt: allSucceeded ? new Date() : undefined,
      },
    });

    this.logger.log(
      `Publish complete for post ${post.id}: ` +
        `${targetResults.filter((r) => r.success).length}/${targetResults.length} targets succeeded`
    );

    return targetResults;
  }

  /**
   * Best-effort deletion of a post from every platform it was published to.
   *
   * Iterates the post's targets that have a `platformPostId` and asks each
   * platform adapter to delete it. Failures are logged but never thrown — the
   * caller (post deletion) must not be blocked by a remote API error.
   */
  async unpublishPost(post: PostWithRelations): Promise<PlatformActionResult[]> {
    const publishedTargets = post.targets.filter((t) => t.platformPostId);
    const results: PlatformActionResult[] = [];

    for (const target of publishedTargets) {
      const prismaPlatform = target.socialAccount.platform;
      const platform = prismaPlatform as unknown as SharedSocialPlatform;
      const adapter = this.adapters.get(prismaPlatform);

      if (!adapter?.unpublish) {
        this.logger.debug(
          `Skipping platform deletion for ${platform} ` +
            `(no unpublish support) target=${target.id}`
        );
        results.push({
          platform,
          success: false,
          supported: false,
          message: `${platform} API does not support deleting published posts.`,
        });
        continue;
      }

      try {
        const decrypted = this.decryptAccount(target.socialAccount);
        await adapter.unpublish(target.platformPostId!, decrypted);
        this.logger.log(
          `Deleted from platform: platform=${platform} ` +
            `platformPostId=${target.platformPostId}`
        );
        results.push({ platform, success: true, supported: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to delete from ${platform} ` +
            `(platformPostId=${target.platformPostId}): ${message}`
        );
        results.push({ platform, success: false, supported: true, message });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async publishToTarget(
    target: PostTarget & { socialAccount: SocialAccount },
    content: PublishContent
  ): Promise<PublishTargetResult> {
    const { socialAccount } = target;
    const adapter = this.adapters.get(socialAccount.platform);

    if (!adapter) {
      const errMsg = `No publisher adapter registered for platform '${socialAccount.platform}'`;
      this.logger.warn(errMsg);

      await this.prisma.postTarget.update({
        where: { id: target.id },
        data: { status: "FAILED", errorMessage: errMsg },
      });

      return {
        targetId: target.id,
        socialAccountId: target.socialAccountId,
        platform: socialAccount.platform,
        success: false,
        errorMessage: errMsg,
      };
    }

    const decrypted = this.decryptAccount(socialAccount);

    // Resolve the platform-specific caption. The composer stores per-platform
    // text either on the target (platformSpecificContent.text) or as a
    // platform-keyed entry on the post content (e.g. content.facebook /
    // content.instagram). Fall back to the shared text. Without this, every
    // platform would publish the same base caption.
    const overrides =
      (target.platformSpecificContent as Record<string, unknown> | null) ?? undefined;
    const platformKey = socialAccount.platform.toLowerCase();
    const rawContent = content.raw ?? {};
    const overrideText =
      overrides && typeof overrides["text"] === "string"
        ? (overrides["text"] as string)
        : typeof rawContent[platformKey] === "string"
          ? (rawContent[platformKey] as string)
          : undefined;

    const mergedContent: PublishContent = {
      ...content,
      text: overrideText ?? content.text,
      platformOverrides: overrides,
    };

    try {
      const result = await adapter.publish(mergedContent, decrypted);

      await this.prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: "PUBLISHED",
          platformPostId: result.platformPostId,
          platformUrl: result.platformUrl,
          publishedAt: result.publishedAt,
          errorMessage: null,
        },
      });

      this.logger.log(
        `Target published: targetId=${target.id} platform=${socialAccount.platform} ` +
          `platformPostId=${result.platformPostId}`
      );

      return {
        targetId: target.id,
        socialAccountId: target.socialAccountId,
        platform: socialAccount.platform,
        success: true,
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `Publish failed: targetId=${target.id} platform=${socialAccount.platform} ` +
          `error=${errorMessage}`
      );

      await this.prisma.postTarget.update({
        where: { id: target.id },
        data: { status: "FAILED", errorMessage },
      });

      return {
        targetId: target.id,
        socialAccountId: target.socialAccountId,
        platform: socialAccount.platform,
        success: false,
        errorMessage,
      };
    }
  }

  private buildContent(post: PostWithRelations): PublishContent {
    const raw = post.content as Record<string, unknown>;
    const text = typeof raw["text"] === "string" ? raw["text"] : "";
    const link = typeof raw["link"] === "string" ? raw["link"] : undefined;
    const hashtags = Array.isArray(raw["hashtags"])
      ? (raw["hashtags"] as string[])
      : undefined;
    const mediaUrls = post.media.map((m) => m.url);

    return { text, link, hashtags, mediaUrls, raw };
  }

  private decryptAccount(account: SocialAccount): DecryptedAccount {
    return {
      id: account.id,
      platform: account.platform,
      platformUserId: account.platformUserId,
      platformUsername: account.platformUsername,
      accessToken: this.encryption.decrypt(account.accessToken),
      refreshToken: account.refreshToken
        ? this.encryption.decrypt(account.refreshToken)
        : null,
    };
  }
}
