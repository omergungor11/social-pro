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
  readonly canDelete = true;

  // Caps to keep a single sync fast and bounded.
  private readonly postLimit = 15;
  private readonly commentLimit = 25;

  async fetchItems(account: InboxAccount): Promise<FetchedInboxItem[]> {
    const items: FetchedInboxItem[] = [];

    // 1. List recent Page posts.
    type Post = {
      id: string;
      permalink_url?: string;
      message?: string;
      full_picture?: string;
    };
    let posts: Post[] = [];
    try {
      const params = new URLSearchParams({
        fields: "id,permalink_url,message,full_picture",
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
            postPreviewText: p.message ?? null,
            postPreviewImageUrl: p.full_picture ?? null,
            postPermalink: p.permalink_url ?? null,
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

    // 3. Pull recent Messenger direct messages (best-effort).
    const dms = await this.fetchDirectMessages(account);
    items.push(...dms);

    return items;
  }

  /**
   * Pulls recent Messenger conversations for the Page. Requires the
   * `pages_messaging` permission; without it the Graph API returns errors
   * (#10, #200, OAuthException). We swallow all errors and return [] so a
   * missing scope never breaks the comment sync.
   */
  private async fetchDirectMessages(
    account: InboxAccount,
  ): Promise<FetchedInboxItem[]> {
    const items: FetchedInboxItem[] = [];

    type Message = {
      id: string;
      message?: string;
      from?: { id?: string; name?: string };
      created_time?: string;
    };
    type Conversation = {
      id: string;
      messages?: { data?: Message[] };
    };

    try {
      const params = new URLSearchParams({
        platform: "messenger",
        fields:
          "participants,updated_time,messages.limit(15){id,message,from,created_time}",
        access_token: account.accessToken,
      });
      const resp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${account.platformUserId}/conversations?${params.toString()}`,
      );
      if (!resp.ok) {
        this.logger.debug(
          `FB DM fetch skipped for account ${account.id}: ${resp.status}`,
        );
        return items;
      }
      const data = (await resp.json()) as { data?: Conversation[] };

      for (const conv of data.data ?? []) {
        for (const m of conv.messages?.data ?? []) {
          items.push({
            platformItemId: m.id,
            type: "DIRECT_MESSAGE",
            parentPlatformId: conv.id,
            authorPlatformId: m.from?.id ?? null,
            authorName: m.from?.name ?? null,
            text: m.message ?? null,
            isOutbound: m.from?.id === account.platformUserId,
            platformCreatedAt: m.created_time
              ? new Date(m.created_time)
              : null,
            raw: m as unknown as Record<string, unknown>,
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `FB DM fetch error for account ${account.id}: ${String(err)}`,
      );
    }

    return items;
  }

  async reply(
    parentPlatformId: string,
    text: string,
    account: InboxAccount,
    context: {
      type: string;
      platformPostId?: string | null;
      authorPlatformId?: string | null;
    },
  ): Promise<ReplyResult> {
    if (context.type === "DIRECT_MESSAGE") {
      if (!context.authorPlatformId) {
        throw new Error("Cannot reply to this DM: missing recipient id.");
      }

      // POST /{page-id}/messages — Messenger Send API.
      const params = new URLSearchParams({
        access_token: account.accessToken,
      });
      const resp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${account.platformUserId}/messages?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_type: "RESPONSE",
            recipient: { id: context.authorPlatformId },
            message: { text },
          }),
        },
      );

      if (!resp.ok) {
        const reason = await resp.text();
        throw new Error(`Facebook DM reply failed: ${reason}`);
      }

      const data = (await resp.json()) as { message_id: string };
      return { platformItemId: data.message_id };
    }

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

  async deleteItem(
    platformItemId: string,
    account: InboxAccount,
    context: { type: string; platformPostId?: string | null },
  ): Promise<void> {
    if (context.type === "DIRECT_MESSAGE") {
      throw new Error("Deleting direct messages is not supported.");
    }

    const params = new URLSearchParams({ access_token: account.accessToken });
    const resp = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${platformItemId}?${params.toString()}`,
      { method: "DELETE" },
    );

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Facebook delete failed: ${body}`);
    }
  }
}
