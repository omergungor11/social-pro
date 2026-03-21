import { Injectable } from "@nestjs/common";
import { RateLimitService, RateLimitResult } from "./rate-limit.service";
import {
  PLATFORM_RATE_LIMITS,
  PLATFORM_RATE_LIMIT_PREFIX,
} from "./rate-limit.constants";

/**
 * Per-platform outbound rate limiter for social API calls.
 * Used by publisher and analytics modules to respect platform limits.
 */
@Injectable()
export class PlatformRateLimitService {
  constructor(private readonly rateLimitService: RateLimitService) {}

  /**
   * Check if a call to a social platform is allowed.
   * @param platform - Platform name (TWITTER, FACEBOOK, etc.)
   * @param agencyId - Agency ID for per-tenant tracking
   */
  async checkPlatformLimit(
    platform: string,
    agencyId: string,
  ): Promise<RateLimitResult> {
    const platformKey = platform.toUpperCase();
    const config = PLATFORM_RATE_LIMITS[platformKey];

    if (!config) {
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetAt: 0,
        retryAfter: 0,
      };
    }

    const key = `${PLATFORM_RATE_LIMIT_PREFIX}${platformKey}:${agencyId}`;
    return this.rateLimitService.checkLimit(key, config.limit, config.windowSec);
  }

  /**
   * Check limit and throw if exceeded. For use in publisher adapters.
   */
  async assertPlatformLimit(
    platform: string,
    agencyId: string,
  ): Promise<void> {
    const result = await this.checkPlatformLimit(platform, agencyId);
    if (!result.allowed) {
      throw new Error(
        `Platform rate limit exceeded for ${platform}. Retry after ${result.retryAfter}s`,
      );
    }
  }
}
