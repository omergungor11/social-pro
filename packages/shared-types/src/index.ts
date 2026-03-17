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
