import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import type {
  FetchedInboxItem,
  InboxAccount,
  PlatformInboxAdapter,
  ReplyResult,
} from "./inbox-adapter.interface";

/**
 * Twitter (X) inbox adapter.
 *
 * Covers @-mentions ingestion and posting replies, both of which the standard
 * Twitter API v2 tier allows. NOTE: the Twitter Direct Message API and full
 * mentions polling (high-volume / firehose) require elevated/paid access tiers
 * that standard apps don't have — this adapter intentionally only handles the
 * mentions timeline + reply tweets supported on the standard tier.
 */
@Injectable()
export class TwitterInboxAdapter implements PlatformInboxAdapter {
  readonly platform = SocialPlatform.TWITTER;
  readonly canReply = true;

  private readonly logger = new Logger(TwitterInboxAdapter.name);
  private readonly apiBase = "https://api.twitter.com/2";

  async fetchItems(account: InboxAccount): Promise<FetchedInboxItem[]> {
    const userId = account.platformUserId;
    const params = new URLSearchParams({
      max_results: "25",
      "tweet.fields": "created_at,author_id,conversation_id",
      expansions: "author_id",
      "user.fields": "username,name,profile_image_url",
    });

    try {
      const response = await fetch(
        `${this.apiBase}/users/${userId}/mentions?${params.toString()}`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Twitter mentions fetch failed (${response.status}) for account ${account.id}: ${errorText}`,
        );
        return [];
      }

      const json = (await response.json()) as TwitterMentionsResponse;

      const tweets = json.data ?? [];
      const usersById = new Map<string, TwitterUser>();
      for (const user of json.includes?.users ?? []) {
        usersById.set(user.id, user);
      }

      return tweets.map((tweet): FetchedInboxItem => {
        const author = tweet.author_id
          ? usersById.get(tweet.author_id)
          : undefined;

        return {
          platformItemId: tweet.id,
          type: "MENTION",
          parentPlatformId: null,
          platformPostId: tweet.conversation_id ?? null,
          authorPlatformId: tweet.author_id ?? null,
          authorName: author?.name ?? null,
          authorUsername: author?.username ?? null,
          authorAvatarUrl: author?.profile_image_url ?? null,
          text: tweet.text ?? null,
          permalink: `https://twitter.com/i/web/status/${tweet.id}`,
          platformCreatedAt: tweet.created_at
            ? new Date(tweet.created_at)
            : null,
          raw: tweet as unknown as Record<string, unknown>,
        };
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Twitter mentions fetch errored for account ${account.id}: ${reason}`,
      );
      return [];
    }
  }

  async reply(
    parentPlatformId: string,
    text: string,
    account: InboxAccount,
    _context: { type: string; platformPostId?: string | null },
  ): Promise<ReplyResult> {
    const response = await fetch(`${this.apiBase}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reply: { in_reply_to_tweet_id: parentPlatformId },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twitter reply failed: ${errorText}`);
    }

    const json = (await response.json()) as {
      data?: { id?: string };
    };

    const id = json.data?.id;
    if (!id) {
      throw new Error("Twitter reply failed: no tweet id in response");
    }

    return {
      platformItemId: id,
      permalink: `https://twitter.com/i/web/status/${id}`,
    };
  }
}

interface TwitterUser {
  id: string;
  username?: string;
  name?: string;
  profile_image_url?: string;
}

interface TwitterMention {
  id: string;
  text?: string;
  author_id?: string;
  conversation_id?: string;
  created_at?: string;
}

interface TwitterMentionsResponse {
  data?: TwitterMention[];
  includes?: { users?: TwitterUser[] };
}
