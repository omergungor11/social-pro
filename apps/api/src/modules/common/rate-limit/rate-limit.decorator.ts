import { SetMetadata } from "@nestjs/common";
import { RATE_LIMIT_KEY, RATE_LIMIT_GROUP_KEY } from "./rate-limit.constants";

export interface RateLimitOptions {
  limit: number;
  windowSec: number;
}

/**
 * Custom rate limit for a specific endpoint.
 * Overrides both plan-based and group-based defaults.
 */
export const RateLimit = (limit: number, windowSec: number): MethodDecorator =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSec } satisfies RateLimitOptions);

/**
 * Assign an endpoint to a rate limit group (auth, publishing, analytics).
 * Group limits override plan-based defaults but are overridden by @RateLimit().
 */
export const RateLimitGroup = (group: string): MethodDecorator =>
  SetMetadata(RATE_LIMIT_GROUP_KEY, group);
