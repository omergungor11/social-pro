import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
  PublishResult,
} from "./publisher-adapter.interface";

interface FacebookPostResponse {
  id: string;
}

/**
 * Facebook publish adapter.
 *
 * Posts to the Page feed via Graph API v19.
 * Character limit: 63,206 characters (Graph API limit).
 *
 * Requires the `pages_manage_posts` and `pages_read_engagement` permissions.
 * The access token must be a Page access token (not a User token).
 */
@Injectable()
export class FacebookPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.FACEBOOK;
  private readonly logger = new Logger(FacebookPublisher.name);
  private readonly graphVersion = "v19.0";
  private readonly apiBase = `https://graph.facebook.com/${this.graphVersion}`;

  getCharacterLimit(): number {
    return 63206;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    const pageId = account.platformUserId;

    this.logger.debug(
      `Publishing to Facebook: pageId=${pageId} accountId=${account.id}`
    );

    const params = new URLSearchParams();
    params.set("message", this.buildMessage(content));
    params.set("access_token", account.accessToken);

    if (content.link) {
      params.set("link", content.link);
    }

    const response = await fetch(`${this.apiBase}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Facebook API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as FacebookPostResponse;

    return {
      platformPostId: data.id,
      platformUrl: `https://www.facebook.com/${data.id}`,
      publishedAt: new Date(),
    };
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
