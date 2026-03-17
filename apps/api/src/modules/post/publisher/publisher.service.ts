import { Injectable, Logger } from "@nestjs/common";
import { Post, PostMedia, PostTarget, SocialAccount, SocialPlatform } from "@social-pro/prisma";
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
    private readonly linkedInPublisher: LinkedInPublisher
  ) {
    this.adapters = new Map([
      [SocialPlatform.TWITTER, this.twitterPublisher],
      [SocialPlatform.FACEBOOK, this.facebookPublisher],
      [SocialPlatform.INSTAGRAM, this.instagramPublisher],
      [SocialPlatform.LINKEDIN, this.linkedInPublisher],
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

    // Merge platform-specific overrides into content
    const mergedContent: PublishContent = {
      ...content,
      platformOverrides:
        (target.platformSpecificContent as Record<string, unknown> | null) ?? undefined,
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
