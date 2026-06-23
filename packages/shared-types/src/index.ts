// Social Pro — Shared Types
// Enums and interfaces shared between frontend and backend

export enum UserRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER",
}

export enum SocialPlatform {
  TWITTER = "TWITTER",
  FACEBOOK = "FACEBOOK",
  INSTAGRAM = "INSTAGRAM",
  LINKEDIN = "LINKEDIN",
  TIKTOK = "TIKTOK",
  YOUTUBE = "YOUTUBE",
}

export enum PostStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  PUBLISHING = "PUBLISHING",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum PostTargetStatus {
  PENDING = "PENDING",
  PUBLISHING = "PUBLISHING",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  GIF = "GIF",
  DOCUMENT = "DOCUMENT",
}

export enum PlanInterval {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export enum NotificationType {
  POST_PUBLISHED = "POST_PUBLISHED",
  POST_FAILED = "POST_FAILED",
  INVITATION = "INVITATION",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  ACCOUNT_DISCONNECT = "ACCOUNT_DISCONNECT",
  LIMIT_WARNING = "LIMIT_WARNING",
  REPORT_READY = "REPORT_READY",
}

// ---------------------------------------------------------------------------
// Social Inbox (comments, mentions, DMs)
// ---------------------------------------------------------------------------

export enum InboxItemType {
  COMMENT = "COMMENT",
  REPLY = "REPLY",
  MENTION = "MENTION",
  DIRECT_MESSAGE = "DIRECT_MESSAGE",
}

export enum InboxItemStatus {
  UNREAD = "UNREAD",
  READ = "READ",
  REPLIED = "REPLIED",
  ARCHIVED = "ARCHIVED",
}

export interface InboxItem {
  id: string;
  socialAccountId: string;
  platform: SocialPlatform;
  type: InboxItemType;
  status: InboxItemStatus;
  platformItemId: string;
  parentPlatformId: string | null;
  platformPostId: string | null;
  postId: string | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  text: string | null;
  permalink: string | null;
  // Snapshot of the post this interaction belongs to (comments/mentions), so
  // the inbox can group by post and show which post a comment is on.
  postPreviewText: string | null;
  postPreviewImageUrl: string | null;
  postPermalink: string | null;
  isOutbound: boolean;
  platformCreatedAt: string | null;
  createdAt: string;
  // Convenience account info for rendering without an extra lookup.
  account?: {
    id: string;
    platform: SocialPlatform;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  // Threaded replies (populated on the thread endpoint).
  replies?: InboxItem[];
}

/**
 * Outcome of attempting a platform-side action (delete/unpublish) for one
 * target. `supported: false` means the platform API offers no such capability
 * (e.g. Instagram/TikTok cannot delete published media) — distinct from an
 * attempt that was made and failed (`supported: true, success: false`).
 */
export interface PlatformActionResult {
  platform: SocialPlatform;
  success: boolean;
  supported: boolean;
  message?: string | null;
}

/** Returned by DELETE /posts/:id — local deletion always happens; platform
 * deletion is best-effort and reported per target. */
export interface PostDeleteResult {
  deleted: boolean;
  platformResults: PlatformActionResult[];
}

/** Returned by DELETE /inbox/:id — local deletion plus platform outcome. */
export interface InboxDeleteResult {
  deleted: boolean;
  platform: PlatformActionResult;
}

export interface InboxStats {
  total: number;
  unread: number;
  byPlatform: Array<{ platform: SocialPlatform; total: number; unread: number }>;
  byType: Array<{ type: InboxItemType; total: number; unread: number }>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  };
}
