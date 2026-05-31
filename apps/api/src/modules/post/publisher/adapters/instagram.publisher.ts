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
 * Uses the Instagram Graph API content-publishing flow:
 *  1. Create a media container (POST /{user-id}/media)
 *  2. Publish the container  (POST /{user-id}/media_publish)
 *
 * For multiple images a carousel is created: each image becomes a child
 * container (`is_carousel_item=true`), then a parent `CAROUSEL` container
 * references them and is published.
 *
 * IMPORTANT: Instagram does NOT accept raw uploaded bytes — it fetches the
 * `image_url` itself, so the URL must be PUBLICLY reachable. In local
 * development (MinIO at localhost) Instagram cannot fetch the image and the
 * container creation will fail; this works once media is served from a public
 * S3/CDN URL.
 *
 * Deletion: the Instagram Graph API provides no endpoint to delete published
 * media, so no `unpublish` is implemented — deleting a post in Social Pro
 * removes it locally but cannot remove it from Instagram.
 *
 * Character limit: 2,200 characters. Requires a Business/Creator account with
 * `instagram_basic` and `instagram_content_publish` scopes.
 */
@Injectable()
export class InstagramPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.INSTAGRAM;
  private readonly logger = new Logger(InstagramPublisher.name);
  private readonly graphVersion = "v22.0";
  private readonly apiBase = `https://graph.facebook.com/${this.graphVersion}`;

  getCharacterLimit(): number {
    return 2200;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    const userId = account.platformUserId;
    const caption = this.buildCaption(content);
    const images = (content.mediaUrls ?? []).filter((u) => !this.looksLikeVideo(u));

    this.logger.debug(
      `Publishing to Instagram: userId=${userId} accountId=${account.id} images=${images.length}`
    );

    if (images.length === 0) {
      throw new Error(
        "Instagram requires at least one image. Add media to this post before publishing."
      );
    }

    const creationId =
      images.length === 1
        ? await this.createSingleContainer(userId, images[0]!, caption, account.accessToken)
        : await this.createCarouselContainer(userId, images, caption, account.accessToken);

    const publishedId = await this.publishContainer(userId, creationId, account.accessToken);

    return {
      platformPostId: publishedId,
      platformUrl: `https://www.instagram.com/p/${publishedId}/`,
      publishedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // Container creation
  // ---------------------------------------------------------------------------

  private async createSingleContainer(
    userId: string,
    imageUrl: string,
    caption: string,
    accessToken: string
  ): Promise<string> {
    const params = new URLSearchParams();
    params.set("image_url", imageUrl);
    params.set("caption", caption);
    params.set("access_token", accessToken);

    const container = await this.postContainer(userId, params);
    return container.id;
  }

  private async createCarouselContainer(
    userId: string,
    imageUrls: string[],
    caption: string,
    accessToken: string
  ): Promise<string> {
    // 1. Create a child container for each image (max 10).
    const childIds: string[] = [];
    for (const url of imageUrls.slice(0, 10)) {
      const childParams = new URLSearchParams();
      childParams.set("image_url", url);
      childParams.set("is_carousel_item", "true");
      childParams.set("access_token", accessToken);
      const child = await this.postContainer(userId, childParams);
      childIds.push(child.id);
    }

    // 2. Create the parent carousel container referencing the children.
    const parentParams = new URLSearchParams();
    parentParams.set("media_type", "CAROUSEL");
    parentParams.set("children", childIds.join(","));
    parentParams.set("caption", caption);
    parentParams.set("access_token", accessToken);
    const parent = await this.postContainer(userId, parentParams);
    return parent.id;
  }

  private async postContainer(
    userId: string,
    params: URLSearchParams
  ): Promise<InstagramContainerResponse> {
    const res = await fetch(`${this.apiBase}/${userId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Instagram container creation failed ${res.status}: ${body}`);
    }
    return (await res.json()) as InstagramContainerResponse;
  }

  private async publishContainer(
    userId: string,
    creationId: string,
    accessToken: string
  ): Promise<string> {
    const params = new URLSearchParams();
    params.set("creation_id", creationId);
    params.set("access_token", accessToken);

    const res = await fetch(`${this.apiBase}/${userId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Instagram publish failed ${res.status}: ${body}`);
    }

    const published = (await res.json()) as InstagramPublishResponse;
    return published.id;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private looksLikeVideo(url: string): boolean {
    return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
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
