import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
  PublishResult,
} from "./publisher-adapter.interface";

interface TikTokPublishInitResponse {
  data?: {
    publish_id?: string;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
}

/**
 * TikTok publish adapter.
 *
 * TikTok is video-only via the Content Posting API:
 *   POST https://open.tiktokapis.com/v2/post/publish/video/init/
 * using PULL_FROM_URL so TikTok fetches the video from a publicly reachable
 * URL (the URL must be publicly accessible — local MinIO URLs will not work).
 *
 * Privacy: unaudited apps may only publish privately (SELF_ONLY); once the app
 * passes TikTok's audit it can use PUBLIC_TO_EVERYONE.
 *
 * Deletion: TikTok provides no API to delete a published video, so no
 * `unpublish` is implemented.
 *
 * Character limit: 2,200 characters (caption).
 */
@Injectable()
export class TikTokPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.TIKTOK;
  private readonly logger = new Logger(TikTokPublisher.name);
  private readonly apiBase = "https://open.tiktokapis.com/v2";

  getCharacterLimit(): number {
    return 2200;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    const videoUrl = (content.mediaUrls ?? []).find((u) => Boolean(u));

    this.logger.debug(
      `Publishing to TikTok: accountId=${account.id} hasVideo=${Boolean(videoUrl)}`,
    );

    if (!videoUrl) {
      throw new Error("TikTok requires a video to publish.");
    }

    const res = await fetch(`${this.apiBase}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: content.text,
          // SELF_ONLY because unaudited apps can only post privately. Once the
          // app passes TikTok's audit, switch this to PUBLIC_TO_EVERYONE.
          privacy_level: "SELF_ONLY",
          disable_comment: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    });

    const json = (await res.json()) as TikTokPublishInitResponse;

    const publishId = json.data?.publish_id;
    const errorCode = json.error?.code;
    const hasError = errorCode != null && errorCode !== "ok";

    if (!res.ok || hasError || !publishId) {
      const reason =
        json.error?.message ?? json.error?.code ?? `HTTP ${res.status}`;
      throw new Error(`TikTok publish failed: ${reason}`);
    }

    return {
      platformPostId: publishId,
      platformUrl: "https://www.tiktok.com/",
      publishedAt: new Date(),
    };
  }
}
