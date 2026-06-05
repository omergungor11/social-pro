import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import type {
  FetchedInboxItem,
  InboxAccount,
  PlatformInboxAdapter,
  ReplyResult,
} from "./inbox-adapter.interface";

/**
 * Facebook Page inbox adapter (Meta Graph API).
 *
 * Pulls comments from the most recent posts of the connected Page and posts
 * replies back. A comment with a `parent` is treated as a threaded reply.
 *
 * `account.platformUserId` is the Page id; `account.accessToken` is the
 * decrypted Page access token.
 */
@Injectable()
export class FacebookInboxAdapter implements PlatformInboxAdapter {
  private readonly apiVersion = "v22.0";
  private readonly logger = new Logger(FacebookInboxAdapter.name);

  readonly platform = SocialPlatform.FACEBOOK;
  readonly canReply = true;

  // Caps to keep a single sync fast and bounded.
  private readonly postLimit = 15;
  private readonly commentLimit = 25;

  async fetchItems(account: InboxAccount): Promise<FetchedInboxItem[]> {
    const items: FetchedInboxItem[] = [];

    // 1. List recent Page posts.
    type Post = { id: string; permalink_url?: string };
    let posts: Post[] = [];
    try {
      const params = new URLSearchParams({
        fields: "id,permalink_url",
        limit: String(this.postLimit),
        access_token: account.accessToken,
      });
      const resp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${account.platformUserId}/posts?${params.toString()}`,
      );
      if (!resp.ok) {
        this.logger.warn(
          `FB posts list failed for account ${account.id}: ${resp.status}`,
        );
        return items;
      }
      const data = (await resp.json()) as { data?: Post[] };
      posts = data.data ?? [];
    } catch (err) {
      this.logger.warn(
        `FB posts list error for account ${account.id}: ${String(err)}`,
      );
      return items;
    }

    // 2. For each post, fetch comments. `from` may be absent without the
    // appropriate Page permissions — handle that gracefully.
    type Comment = {
      id: string;
      message?: string;
      from?: { id?: string; name?: string };
      created_time?: string;
      parent?: { id?: string };
    };

    for (const p of posts) {
      try {
        const params = new URLSearchParams({
          fields: "id,message,from{id,name},created_time,parent",
          limit: String(this.commentLimit),
          access_token: account.accessToken,
        });
        const resp = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${p.id}/comments?${params.toString()}`,
        );
        if (!resp.ok) {
          this.logger.warn(
            `FB comments fetch failed for post ${p.id}: ${resp.status}`,
          );
          continue;
        }
        const data = (await resp.json()) as { data?: Comment[] };

        for (const c of data.data ?? []) {
          const parentId = c.parent?.id ?? null;
          items.push({
            platformItemId: c.id,
            type: parentId ? "REPLY" : "COMMENT",
            parentPlatformId: parentId,
            platformPostId: p.id,
            permalink: p.permalink_url ?? null,
            authorPlatformId: c.from?.id ?? null,
            authorName: c.from?.name ?? null,
            text: c.message ?? null,
            platformCreatedAt: c.created_time
              ? new Date(c.created_time)
              : null,
            raw: c as unknown as Record<string, unknown>,
          });
        }
      } catch (err) {
        this.logger.warn(
          `FB comments error for post ${p.id}: ${String(err)}`,
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
    // POST /{comment-id}/comments — adds a reply under the given comment.
    const params = new URLSearchParams({
      message: text,
      access_token: account.accessToken,
    });
    const resp = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${parentPlatformId}/comments?${params.toString()}`,
      { method: "POST" },
    );

    if (!resp.ok) {
      const reason = await resp.text();
      throw new Error(`Facebook reply failed: ${reason}`);
    }

    const data = (await resp.json()) as { id: string };
    return { platformItemId: data.id };
  }
}
