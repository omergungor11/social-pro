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

/**
 * Twitter (X) publish adapter.
 *
 * Uses the Twitter API v2 POST /2/tweets endpoint.
 * Character limit: 280 characters.
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

    this.logger.debug(
      `Publishing to Twitter: accountId=${account.id} chars=${text.length}`
    );

    const body: Record<string, unknown> = { text };

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
      throw new Error(
        `Twitter API error ${response.status}: ${errorBody}`
      );
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
