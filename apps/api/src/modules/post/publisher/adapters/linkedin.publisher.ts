import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import {
  DecryptedAccount,
  PlatformPublisher,
  PublishContent,
  PublishResult,
} from "./publisher-adapter.interface";

interface LinkedInPostResponse {
  id: string;
}

/**
 * LinkedIn publish adapter.
 *
 * Uses the LinkedIn Posts API (v2) to create a text / article post on the
 * member's feed.
 *
 * Character limit: 3,000 characters.
 *
 * Required OAuth scopes: `w_member_social`
 */
@Injectable()
export class LinkedInPublisher implements PlatformPublisher {
  readonly platform = SocialPlatform.LINKEDIN;
  private readonly logger = new Logger(LinkedInPublisher.name);
  private readonly apiBase = "https://api.linkedin.com/v2";

  getCharacterLimit(): number {
    return 3000;
  }

  async publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult> {
    this.logger.debug(
      `Publishing to LinkedIn: accountId=${account.id}`
    );

    const text = this.buildText(content);
    const authorUrn = `urn:li:person:${account.platformUserId}`;

    const payload: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: content.link ? "ARTICLE" : "NONE",
          ...(content.link
            ? {
                media: [
                  {
                    status: "READY",
                    originalUrl: content.link,
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await fetch(`${this.apiBase}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as LinkedInPostResponse;
    const postId = data.id;

    return {
      platformPostId: postId,
      platformUrl: `https://www.linkedin.com/feed/update/${postId}`,
      publishedAt: new Date(),
    };
  }

  /** Deletes a published UGC post from the member's feed by its URN. */
  async unpublish(platformPostId: string, account: DecryptedAccount): Promise<void> {
    const encodedUrn = encodeURIComponent(platformPostId);
    const response = await fetch(`${this.apiBase}/ugcPosts/${encodedUrn}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`LinkedIn delete error ${response.status}: ${errorBody}`);
    }

    this.logger.log(`LinkedIn post deleted: platformPostId=${platformPostId}`);
  }

  private buildText(content: PublishContent): string {
    let text = content.text;

    if (content.hashtags?.length) {
      const tags = content.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      text = `${text}\n\n${tags}`;
    }

    if (text.length > this.getCharacterLimit()) {
      text = `${text.slice(0, this.getCharacterLimit() - 1)}…`;
    }

    return text;
  }
}
