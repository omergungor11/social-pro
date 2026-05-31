import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
  PublishResult,
} from "./publisher-adapter.interface";

interface FacebookPostResponse {
  /** Photo id (for /photos) or story id (for /feed). */
  id: string;
  /** Feed story id returned by /photos when published directly. */
  post_id?: string;
}

/**
 * Facebook publish adapter.
 *
 * Posts to the Page feed via Graph API. Supports text-only posts as well as
 * single- and multi-photo posts.
 *
 * Media handling: image bytes are fetched from storage (which the API server
 * can reach — including a local MinIO endpoint) and uploaded directly to the
 * Graph API as multipart `source`. This avoids requiring the media URL to be
 * publicly reachable by Facebook, which is not the case in local development.
 *
 * Requires the `pages_manage_posts` and `pages_read_engagement` permissions.
 * The access token must be a Page access token (not a User token).
 */
@Injectable()
export class FacebookPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.FACEBOOK;
  private readonly logger = new Logger(FacebookPublisher.name);
  private readonly graphVersion = "v22.0";
  private readonly apiBase = `https://graph.facebook.com/${this.graphVersion}`;

  getCharacterLimit(): number {
    return 63206;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    const pageId = account.platformUserId;
    const message = this.buildMessage(content);
    const images = (content.mediaUrls ?? []).filter((u) => !this.looksLikeVideo(u));

    this.logger.debug(
      `Publishing to Facebook: pageId=${pageId} accountId=${account.id} images=${images.length}`
    );

    if (images.length === 1) {
      return this.publishSinglePhoto(pageId, message, images[0]!, account.accessToken);
    }
    if (images.length > 1) {
      return this.publishMultiPhoto(pageId, message, images, account.accessToken);
    }
    return this.publishText(pageId, message, content.link, account.accessToken);
  }

  /** Deletes a published post (or photo story) from the Page. */
  async unpublish(platformPostId: string, account: DecryptedAccount): Promise<void> {
    const params = new URLSearchParams({ access_token: account.accessToken });
    const response = await fetch(`${this.apiBase}/${platformPostId}?${params.toString()}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Facebook delete error ${response.status}: ${errorBody}`);
    }

    this.logger.log(`Facebook post deleted: platformPostId=${platformPostId}`);
  }

  // ---------------------------------------------------------------------------
  // Publish strategies
  // ---------------------------------------------------------------------------

  private async publishText(
    pageId: string,
    message: string,
    link: string | undefined,
    accessToken: string
  ): Promise<PublishResult> {
    const params = new URLSearchParams();
    params.set("message", message);
    params.set("access_token", accessToken);
    if (link) params.set("link", link);

    const response = await fetch(`${this.apiBase}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await this.parseResponse(response);
    const postId = data.id;
    return {
      platformPostId: postId,
      platformUrl: `https://www.facebook.com/${postId}`,
      publishedAt: new Date(),
    };
  }

  private async publishSinglePhoto(
    pageId: string,
    message: string,
    imageUrl: string,
    accessToken: string
  ): Promise<PublishResult> {
    const blob = await this.fetchAsBlob(imageUrl);
    const form = new FormData();
    form.set("message", message);
    form.set("access_token", accessToken);
    form.set("source", blob, "image.jpg");

    const response = await fetch(`${this.apiBase}/${pageId}/photos`, {
      method: "POST",
      body: form,
    });

    const data = await this.parseResponse(response);
    // For photo posts, post_id is the deletable feed story; fall back to id.
    const postId = data.post_id ?? data.id;
    return {
      platformPostId: postId,
      platformUrl: `https://www.facebook.com/${postId}`,
      publishedAt: new Date(),
    };
  }

  private async publishMultiPhoto(
    pageId: string,
    message: string,
    imageUrls: string[],
    accessToken: string
  ): Promise<PublishResult> {
    // 1. Upload each image as an unpublished photo to obtain its media fbid.
    const mediaFbids: string[] = [];
    for (const url of imageUrls.slice(0, 10)) {
      const blob = await this.fetchAsBlob(url);
      const form = new FormData();
      form.set("published", "false");
      form.set("access_token", accessToken);
      form.set("source", blob, "image.jpg");

      const resp = await fetch(`${this.apiBase}/${pageId}/photos`, {
        method: "POST",
        body: form,
      });
      const data = await this.parseResponse(resp);
      mediaFbids.push(data.id);
    }

    // 2. Create a single feed post attaching all uploaded photos.
    const params = new URLSearchParams();
    params.set("message", message);
    params.set("access_token", accessToken);
    mediaFbids.forEach((fbid, i) => {
      params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: fbid }));
    });

    const response = await fetch(`${this.apiBase}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await this.parseResponse(response);
    const postId = data.id;
    return {
      platformPostId: postId,
      platformUrl: `https://www.facebook.com/${postId}`,
      publishedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async parseResponse(response: Response): Promise<FacebookPostResponse> {
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Facebook API error ${response.status}: ${errorBody}`);
    }
    return (await response.json()) as FacebookPostResponse;
  }

  /** Downloads media bytes from storage so they can be uploaded as multipart. */
  private async fetchAsBlob(url: string): Promise<Blob> {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch media for upload (${resp.status}): ${url}`);
    }
    const buffer = await resp.arrayBuffer();
    const type = resp.headers.get("content-type") ?? "image/jpeg";
    return new Blob([buffer], { type });
  }

  private looksLikeVideo(url: string): boolean {
    return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
  }

  private buildMessage(content: PublishContent): string {
    let message = content.text;

    if (content.hashtags?.length) {
      const tags = content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      message = `${message}\n\n${tags}`;
    }

    return message;
  }
}
