import { SocialPlatform } from "@social-pro/prisma";

/**
 * Decrypted social account credentials passed to an inbox adapter.
 * Mirrors the publisher's DecryptedAccount so both pipelines share a shape.
 */
export interface InboxAccount {
  id: string;
  platform: SocialPlatform;
  platformUserId: string;
  platformUsername: string | null;
  accessToken: string;
  refreshToken: string | null;
  metadata: Record<string, unknown>;
}

/**
 * A normalized interaction fetched from a platform (comment, reply, mention,
 * or direct message). Adapters translate platform payloads into this shape;
 * the InboxService persists it as an `InboxItem`.
 */
export interface FetchedInboxItem {
  /** Stable id of the item on the platform (comment id, message id, …). */
  platformItemId: string;
  type: "COMMENT" | "REPLY" | "MENTION" | "DIRECT_MESSAGE";
  /** Parent item id on the platform, for threading replies. */
  parentPlatformId?: string | null;
  /** The platform post the interaction is attached to (comments/mentions). */
  platformPostId?: string | null;
  authorPlatformId?: string | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  text?: string | null;
  permalink?: string | null;
  /** Snapshot of the post this interaction belongs to (comments/mentions). */
  postPreviewText?: string | null;
  postPreviewImageUrl?: string | null;
  postPermalink?: string | null;
  /** True when authored by the connected account itself (our own reply). */
  isOutbound?: boolean;
  platformCreatedAt?: Date | null;
  raw?: Record<string, unknown>;
}

/**
 * Result of posting a reply to the platform.
 */
export interface ReplyResult {
  platformItemId: string;
  permalink?: string | null;
  createdAt?: Date | null;
}

/**
 * Contract every platform inbox adapter implements.
 *
 * Adapters are best-effort: when a platform's API tier or granted permissions
 * don't allow a capability (e.g. Twitter DM API, LinkedIn messaging), the
 * adapter should return an empty list from `fetchItems` and throw a clear,
 * user-facing error from `reply` rather than failing silently.
 */
export interface PlatformInboxAdapter {
  readonly platform: SocialPlatform;

  /**
   * Pulls recent interactions (comments/mentions/DMs) for the account.
   * Implementations should never throw for "no data / not permitted" — they
   * return an empty array and let the service treat it as a no-op sync.
   */
  fetchItems(account: InboxAccount): Promise<FetchedInboxItem[]>;

  /**
   * Posts a reply to a given parent interaction (a comment id, a DM thread …).
   * @throws Error with a descriptive, user-facing message when unsupported or
   *   when the platform API rejects the request.
   */
  reply(
    parentPlatformId: string,
    text: string,
    account: InboxAccount,
    context: {
      type: string;
      platformPostId?: string | null;
      // The originating author's platform id (PSID). Required to address the
      // recipient when replying to a DIRECT_MESSAGE via the platform Send API.
      authorPlatformId?: string | null;
    },
  ): Promise<ReplyResult>;

  /** Whether this adapter can post replies given current API access. */
  readonly canReply: boolean;

  /**
   * Deletes an interaction (typically a comment) from the platform.
   * Only implemented by adapters whose platform API supports it. When present,
   * `canDelete` must be true.
   * @throws Error with a descriptive, user-facing message when the platform
   *   API rejects the request.
   */
  deleteItem?(
    platformItemId: string,
    account: InboxAccount,
    context: { type: string; platformPostId?: string | null },
  ): Promise<void>;

  /** Whether this adapter can delete items (comments) given current API access. */
  readonly canDelete: boolean;
}
