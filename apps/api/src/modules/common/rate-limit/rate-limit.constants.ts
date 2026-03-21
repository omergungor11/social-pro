/**
 * Rate limiting constants for Social Pro API.
 */

/** Per-tenant API rate limits by plan tier (requests per minute) */
export const PLAN_RATE_LIMITS: Record<string, { limit: number; windowSec: number }> = {
  FREE: { limit: 100, windowSec: 60 },
  STARTER: { limit: 300, windowSec: 60 },
  PROFESSIONAL: { limit: 1000, windowSec: 60 },
  ENTERPRISE: { limit: 5000, windowSec: 60 },
};

/** Default rate limit for unknown/missing plan */
export const DEFAULT_RATE_LIMIT = { limit: 100, windowSec: 60 };

/** Endpoint group rate limits */
export const GROUP_RATE_LIMITS: Record<string, { limit: number; windowSec: number }> = {
  auth: { limit: 20, windowSec: 60 },
  publishing: { limit: 60, windowSec: 60 },
  analytics: { limit: 120, windowSec: 60 },
};

/** Per-platform outbound social API limits */
export const PLATFORM_RATE_LIMITS: Record<string, { limit: number; windowSec: number }> = {
  TWITTER: { limit: 300, windowSec: 900 },       // 300 per 15 min
  FACEBOOK: { limit: 200, windowSec: 3600 },      // 200 per hour
  INSTAGRAM: { limit: 200, windowSec: 3600 },     // 200 per hour
  LINKEDIN: { limit: 100, windowSec: 86400 },     // 100 per day
  TIKTOK: { limit: 100, windowSec: 86400 },       // 100 per day
  YOUTUBE: { limit: 10000, windowSec: 86400 },    // 10k per day
};

/** Redis key prefixes */
export const RATE_LIMIT_PREFIX = "rl:api:";
export const PLATFORM_RATE_LIMIT_PREFIX = "rl:platform:";

/** Metadata keys for decorators */
export const RATE_LIMIT_KEY = "rate_limit";
export const RATE_LIMIT_GROUP_KEY = "rate_limit_group";
