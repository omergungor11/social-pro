import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
  PublishResult,
} from "./publisher-adapter.interface";

interface InstagramContainerResponse {
  id: string;
}

interface InstagramPublishResponse {
  id: string;
}

/**
 * Instagram publish adapter.
 *
 * Uses the Instagram Graph API two-step flow:
 *  1. Create a media container (POST /{user-id}/media)
 *  2. Publish the container  (POST /{user-id}/media_publish)
 *
 * Character limit: 2,200 characters (Instagram caption limit).
 *
 * Requires a Business or Creator account linked to a Facebook Page.
 * Access token must have `instagram_basic` and `instagram_content_publish` scopes.
 */
@Injectable()
export class InstagramPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.INSTAGRAM;
  private readonly logger = new Logger(InstagramPublisher.name);
  private readonly graphVersion = "v19.0";
  private readonly apiBase = `https://graph.facebook.com/${this.graphVersion}`;

  getCharacterLimit(): number {
    return 2200;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    const userId = account.platformUserId;

    this.logger.debug(
      `Publishing to Instagram: userId=${userId} accountId=${account.id}`
    );

    const caption = this.buildCaption(content);
    const imageUrl = content.mediaUrls?.[0];

    if (!imageUrl) {
      throw new Error(
        "Instagram requires at least one image URL. Add media to this post."
      );
    }

    // Step 1: create media container
    const containerParams = new URLSearchParams();
    containerParams.set("image_url", imageUrl);
    containerParams.set("caption", caption);
    containerParams.set("access_token", account.accessToken);

    const containerRes = await fetch(`${this.apiBase}/${userId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: containerParams.toString(),
    });

    if (!containerRes.ok) {
      const body = await containerRes.text();
      throw new Error(`Instagram container creation failed ${containerRes.status}: ${body}`);
    }

    const container = (await containerRes.json()) as InstagramContainerResponse;

    // Step 2: publish the container
    const publishParams = new URLSearchParams();
    publishParams.set("creation_id", container.id);
    publishParams.set("access_token", account.accessToken);

    const publishRes = await fetch(`${this.apiBase}/${userId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishParams.toString(),
    });

    if (!publishRes.ok) {
      const body = await publishRes.text();
      throw new Error(`Instagram publish failed ${publishRes.status}: ${body}`);
    }

    const published = (await publishRes.json()) as InstagramPublishResponse;

    return {
      platformPostId: published.id,
      platformUrl: `https://www.instagram.com/p/${published.id}/`,
      publishedAt: new Date(),
    };
  }

  private buildCaption(content: PublishContent): string {
    let caption = content.text;

    if (content.hashtags?.length) {
      const tags = content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      caption = `${caption}\n\n${tags}`;
    }

    if (caption.length > this.getCharacterLimit()) {
      caption = `${caption.slice(0, this.getCharacterLimit() - 1)}…`;
    }

    return caption;
  }
}
