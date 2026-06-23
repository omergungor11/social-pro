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
  readonly canDelete = true;

  // Caps to keep a single sync fast and bounded.
  private readonly mediaLimit = 15;
  private readonly commentLimit = 25;

  /**
   * Resolves the Facebook Page id backing this IG account. Instagram
   * conversations (DMs) and the Send API must be addressed on the PAGE id, not
   * the IG user id — calling them on the IG id returns Graph error #3
   * ("Application does not have the capability"). The stored token is the Page
   * token, so /me returns the Page.
   */
  /**
   * True when a Send API error is the "outside the allowed window" error
   * (Graph error #10, subcode 2534022) — the 24h messaging window has closed.
   */
  private isWindowClosedError(body: string): boolean {
    if (body.includes("2534022")) return true;
    try {
      const parsed = JSON.parse(body) as {
        error?: { code?: number; error_subcode?: number };
      };
      return parsed.error?.code === 10 || parsed.error?.error_subcode === 2534022;
    } catch {
      return false;
    }
  }

  private async resolvePageId(account: InboxAccount): Promise<string | null> {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id&access_token=${encodeURIComponent(account.accessToken)}`,
      );
      if (!resp.ok) return null;
      const data = (await resp.json()) as { id?: string };
      return data.id ?? null;
    } catch {
      return null;
    }
  }

  async fetchItems(account: InboxAccount): Promise<FetchedInboxItem[]> {
    const items: FetchedInboxItem[] = [];

    // 1. List recent media for the IG user.
    type Media = {
      id: string;
      permalink?: string;
      caption?: string;
      media_url?: string;
      thumbnail_url?: string;
    };
    let media: Media[] = [];
    try {
      const params = new URLSearchParams({
        fields: "id,permalink,caption,media_url,thumbnail_url",
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
            postPreviewText: m.caption ?? null,
            postPreviewImageUrl: m.media_url ?? m.thumbnail_url ?? null,
            postPermalink: m.permalink ?? null,
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
              postPreviewText: m.caption ?? null,
              postPreviewImageUrl: m.media_url ?? m.thumbnail_url ?? null,
              postPermalink: m.permalink ?? null,
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

    // 3. Pull recent Instagram direct messages (best-effort).
    const dms = await this.fetchDirectMessages(account);
    items.push(...dms);

    return items;
  }

  /**
   * Pulls recent Instagram conversations. Requires the
   * `instagram_manage_messages` permission; without it the Graph API returns
   * errors (#10, #200, OAuthException). We swallow all errors and return [] so
   * a missing scope never breaks the comment sync.
   */
  private async fetchDirectMessages(
    account: InboxAccount,
  ): Promise<FetchedInboxItem[]> {
    const items: FetchedInboxItem[] = [];

    type Message = {
      id: string;
      message?: string;
      from?: { id?: string; name?: string; username?: string };
      created_time?: string;
    };
    type Participant = { id?: string; username?: string; name?: string };
    type Conversation = {
      id: string;
      participants?: { data?: Participant[] };
      messages?: { data?: Message[] };
    };

    // IG conversations live on the backing Page id, not the IG user id.
    const pageId = await this.resolvePageId(account);
    if (!pageId) {
      this.logger.debug(`IG DM fetch skipped for account ${account.id}: no page id`);
      return items;
    }

    try {
      const params = new URLSearchParams({
        platform: "instagram",
        fields:
          "participants,updated_time,messages.limit(15){id,message,from,created_time}",
        access_token: account.accessToken,
      });
      const resp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${pageId}/conversations?${params.toString()}`,
      );
      if (!resp.ok) {
        const body = await resp.text();
        this.logger.warn(
          `IG DM fetch failed for account ${account.id} (${resp.status}): ${body.slice(0, 200)}`,
        );
        return items;
      }
      const data = (await resp.json()) as { data?: Conversation[] };

      for (const conv of data.data ?? []) {
        // Map participant id -> username so each message can show a sender name
        // (the message `from` sometimes carries only an Instagram-scoped id).
        const participants = conv.participants?.data ?? [];
        const participantById = new Map<string, Participant>();
        for (const part of participants) {
          if (part.id) participantById.set(part.id, part);
        }
        // The other side of a 1:1 thread — used as a last-resort sender name
        // for inbound messages whose `from` lacks a username.
        const counterparty = participants.find(
          (p) => p.id !== account.platformUserId,
        );

        for (const m of conv.messages?.data ?? []) {
          const isOutbound = m.from?.id === account.platformUserId;
          const part = m.from?.id ? participantById.get(m.from.id) : undefined;
          const username =
            m.from?.username ??
            part?.username ??
            (isOutbound ? account.platformUsername : counterparty?.username) ??
            null;
          items.push({
            platformItemId: m.id,
            type: "DIRECT_MESSAGE",
            parentPlatformId: conv.id,
            authorPlatformId: m.from?.id ?? null,
            authorUsername: username,
            authorName: m.from?.name ?? part?.name ?? username,
            text: m.message ?? null,
            isOutbound,
            platformCreatedAt: m.created_time
              ? new Date(m.created_time)
              : null,
            raw: m as unknown as Record<string, unknown>,
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        `IG DM fetch error for account ${account.id}: ${String(err)}`,
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

      // POST /{page-id}/messages — Instagram Send API (addressed on the Page).
      const pageId = await this.resolvePageId(account);
      if (!pageId) {
        throw new Error("Instagram DM reply failed: could not resolve page id.");
      }
      const url = `https://graph.facebook.com/${this.apiVersion}/${pageId}/messages?access_token=${encodeURIComponent(account.accessToken)}`;
      const recipient = { id: context.authorPlatformId };

      const send = (payload: Record<string, unknown>): Promise<Response> =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

      // Standard reply: only allowed inside the 24-hour messaging window.
      let resp = await send({
        messaging_type: "RESPONSE",
        recipient,
        message: { text },
      });

      // If the window is closed (error #10 / subcode 2534022), retry once with
      // the HUMAN_AGENT tag, which extends the window to 7 days for human
      // customer-service replies (requires the Human Agent feature on the app).
      if (!resp.ok) {
        const firstBody = await resp.text();
        if (this.isWindowClosedError(firstBody)) {
          resp = await send({
            messaging_type: "MESSAGE_TAG",
            tag: "HUMAN_AGENT",
            recipient,
            message: { text },
          });
          if (!resp.ok) {
            const retryBody = await resp.text();
            throw new Error(
              this.isWindowClosedError(retryBody)
                ? "Yanıt penceresi kapandı: Instagram, kullanıcının son mesajından 24 saat (insan temsilci etiketiyle 7 gün) sonra yanıt göndermeye izin vermiyor."
                : `Instagram DM reply failed: ${retryBody}`,
            );
          }
        } else {
          throw new Error(`Instagram DM reply failed: ${firstBody}`);
        }
      }

      const data = (await resp.json()) as { message_id: string };
      return { platformItemId: data.message_id, createdAt: new Date() };
    }

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
      throw new Error(`Instagram delete failed: ${body}`);
    }
  }
}
