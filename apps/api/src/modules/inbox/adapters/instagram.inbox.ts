import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import type {
  FetchedInboxItem,
  InboxAccount,
  PlatformInboxAdapter,
  ReplyResult,
} from "./inbox-adapter.interface";

/**
 * Instagram inbox adapter (Meta Graph API).
 *
 * Pulls comments (and their replies) from the most recent media of the
 * connected Instagram Business/Creator account, and posts replies back.
 *
 * `account.platformUserId` is the IG user id; `account.accessToken` is the
 * decrypted IG-linked Page access token.
 */
@Injectable()
export class InstagramInboxAdapter implements PlatformInboxAdapter {
  private readonly apiVersion = "v22.0";
  private readonly logger = new Logger(InstagramInboxAdapter.name);

  readonly platform = SocialPlatform.INSTAGRAM;
  readonly canReply = true;

  // Caps to keep a single sync fast and bounded.
  private readonly mediaLimit = 15;
  private readonly commentLimit = 25;

  async fetchItems(account: InboxAccount): Promise<FetchedInboxItem[]> {
    const items: FetchedInboxItem[] = [];

    // 1. List recent media for the IG user.
    type Media = { id: string; permalink?: string; caption?: string };
    let media: Media[] = [];
    try {
      const params = new URLSearchParams({
        fields: "id,permalink,caption",
        limit: String(this.mediaLimit),
        access_token: account.accessToken,
      });
      const resp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${account.platformUserId}/media?${params.toString()}`,
      );
      if (!resp.ok) {
        this.logger.warn(
          `IG media list failed for account ${account.id}: ${resp.status}`,
        );
        return items;
      }
      const data = (await resp.json()) as { data?: Media[] };
      media = data.data ?? [];
    } catch (err) {
      this.logger.warn(
        `IG media list error for account ${account.id}: ${String(err)}`,
      );
      return items;
    }

    // 2. For each media, fetch comments + nested replies.
    type Comment = {
      id: string;
      text?: string;
      username?: string;
      timestamp?: string;
      replies?: {
        data?: Array<{
          id: string;
          text?: string;
          username?: string;
          timestamp?: string;
        }>;
      };
    };

    for (const m of media) {
      try {
        const params = new URLSearchParams({
          fields:
            "id,text,username,timestamp,replies{id,text,username,timestamp}",
          limit: String(this.commentLimit),
          access_token: account.accessToken,
        });
        const resp = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${m.id}/comments?${params.toString()}`,
        );
        if (!resp.ok) {
          this.logger.warn(
            `IG comments fetch failed for media ${m.id}: ${resp.status}`,
          );
          continue;
        }
        const data = (await resp.json()) as { data?: Comment[] };

        for (const c of data.data ?? []) {
          // Top-level comment.
          items.push({
            platformItemId: c.id,
            type: "COMMENT",
            parentPlatformId: null,
            platformPostId: m.id,
            permalink: m.permalink ?? null,
            authorUsername: c.username ?? null,
            text: c.text ?? null,
            platformCreatedAt: c.timestamp ? new Date(c.timestamp) : null,
            raw: c as unknown as Record<string, unknown>,
          });

          // Nested replies on this comment.
          for (const r of c.replies?.data ?? []) {
            items.push({
              platformItemId: r.id,
              type: "REPLY",
              parentPlatformId: c.id,
              platformPostId: m.id,
              permalink: m.permalink ?? null,
              authorUsername: r.username ?? null,
              text: r.text ?? null,
              platformCreatedAt: r.timestamp ? new Date(r.timestamp) : null,
              raw: r as unknown as Record<string, unknown>,
            });
          }
        }
      } catch (err) {
        this.logger.warn(
          `IG comments error for media ${m.id}: ${String(err)}`,
        );
      }
    }

    return items;
  }

  async reply(
    parentPlatformId: string,
    text: string,
    account: InboxAccount,
  ): Promise<ReplyResult> {
    // POST /{ig-comment-id}/replies — adds a reply under the given comment.
    const params = new URLSearchParams({
      message: text,
      access_token: account.accessToken,
    });
    const resp = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${parentPlatformId}/replies?${params.toString()}`,
      { method: "POST" },
    );

    if (!resp.ok) {
      const reason = await resp.text();
      throw new Error(`Instagram reply failed: ${reason}`);
    }

    const data = (await resp.json()) as { id: string };
    return { platformItemId: data.id, createdAt: new Date() };
  }
}
