/**
 * Re-export all shared types from @social-pro/shared-types.
 * Import from here within the web app to avoid deep package paths.
 *
 * @example
 *   import type { UserRole, ApiResponse } from '@/types';
 */
export type {
  ApiResponse,
  ApiError,
} from "@social-pro/shared-types";

export {
  UserRole,
  SocialPlatform,
  PostStatus,
  PostTargetStatus,
  MediaType,
  PlanInterval,
  NotificationType,
} from "@social-pro/shared-types";
