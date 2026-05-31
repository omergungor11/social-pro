import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
  PublishResult,
} from "./publisher-adapter.interface";

interface TwitterTweetResponse {
  data: {
    id: string;
    text: string;
  };
}

interface TwitterMediaUploadResponse {
  data?: { id?: string; media_key?: string };
  media_id_string?: string;
}

/**
 * Twitter (X) publish adapter.
 *
 * Uses the Twitter API v2 POST /2/tweets endpoint. Images are uploaded first
 * via the v2 media upload endpoint (multipart, OAuth 2.0 user context) and
 * attached to the tweet through their media ids.
 *
 * Character limit: 280 characters. Up to 4 images per tweet.
 *
 * Media upload requires the `media.write` scope on the connected account —
 * accounts connected before this scope was added must be reconnected.
 */
@Injectable()
export class TwitterPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.TWITTER;
  private readonly logger = new Logger(TwitterPublisher.name);
  private readonly apiBase = "https://api.twitter.com/2";

  getCharacterLimit(): number {
    return 280;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    const text = this.buildTweetText(content);
    const images = (content.mediaUrls ?? []).filter((u) => !this.looksLikeVideo(u));

    this.logger.debug(
      `Publishing to Twitter: accountId=${account.id} chars=${text.length} images=${images.length}`
    );

    // Upload up to 4 images and collect their media ids.
    const mediaIds: string[] = [];
    for (const url of images.slice(0, 4)) {
      const id = await this.uploadImage(url, account.accessToken);
      mediaIds.push(id);
    }

    const body: Record<string, unknown> = { text };
    if (mediaIds.length > 0) {
      body["media"] = { media_ids: mediaIds };
    }

    const response = await fetch(`${this.apiBase}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Twitter API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as TwitterTweetResponse;
    const tweetId = data.data.id;
    const username = account.platformUsername ?? account.platformUserId;

    return {
      platformPostId: tweetId,
      platformUrl: `https://twitter.com/${username}/status/${tweetId}`,
      publishedAt: new Date(),
    };
  }

  /** Deletes a tweet via DELETE /2/tweets/:id. */
  async unpublish(platformPostId: string, account: DecryptedAccount): Promise<void> {
    const response = await fetch(`${this.apiBase}/tweets/${platformPostId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Twitter delete error ${response.status}: ${errorBody}`);
    }

    this.logger.log(`Tweet deleted: platformPostId=${platformPostId}`);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Uploads a single image to Twitter and returns its media id.
   * Bytes are streamed from storage as multipart `media`, so the source URL
   * does not need to be publicly reachable by Twitter.
   */
  private async uploadImage(url: string, accessToken: string): Promise<string> {
    const blob = await this.fetchAsBlob(url);
    const form = new FormData();
    form.set("media", blob, "image.jpg");
    form.set("media_category", "tweet_image");

    const response = await fetch(`${this.apiBase}/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Twitter media upload error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as TwitterMediaUploadResponse;
    const mediaId = data.data?.id ?? data.media_id_string;
    if (!mediaId) {
      throw new Error("Twitter media upload returned no media id");
    }
    return mediaId;
  }

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

  private buildTweetText(content: PublishContent): string {
    let text = content.text;

    if (content.hashtags?.length) {
      const tags = content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      text = `${text} ${tags}`;
    }

    if (text.length > this.getCharacterLimit()) {
      text = `${text.slice(0, this.getCharacterLimit() - 1)}…`;
    }

    return text;
  }
}
