import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { RateLimitService } from "./rate-limit.service";
import {
  RATE_LIMIT_KEY,
  RATE_LIMIT_GROUP_KEY,
  RATE_LIMIT_PREFIX,
  PLAN_RATE_LIMITS,
  DEFAULT_RATE_LIMIT,
  GROUP_RATE_LIMITS,
} from "./rate-limit.constants";
import { RateLimitOptions } from "./rate-limit.decorator";

interface RequestWithUser extends Request {
  user?: {
    agencyId?: string;
    plan?: string;
    sub?: string;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    // Determine the rate limit to apply (priority: decorator > group > plan)
    const { key, limit, windowSec } = this.resolveLimit(context, request);

    const result = await this.rateLimitService.checkLimit(key, limit, windowSec);

    // Always set rate limit headers
    response.setHeader("X-RateLimit-Limit", result.limit);
    response.setHeader("X-RateLimit-Remaining", result.remaining);
    response.setHeader("X-RateLimit-Reset", result.resetAt);

    if (!result.allowed) {
      response.setHeader("Retry-After", result.retryAfter);
      throw new HttpException(
        {
          error: {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many requests. Retry after ${result.retryAfter} seconds.`,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveLimit(
    context: ExecutionContext,
    request: RequestWithUser,
  ): { key: string; limit: number; windowSec: number } {
    // 1. Check for explicit @RateLimit() decorator
    const customLimit = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (customLimit) {
      const identifier = request.user?.agencyId ?? request.ip ?? "anonymous";
      return {
        key: `${RATE_LIMIT_PREFIX}custom:${identifier}:${context.getClass().name}:${context.getHandler().name}`,
        limit: customLimit.limit,
        windowSec: customLimit.windowSec,
      };
    }

    // 2. Check for @RateLimitGroup() decorator
    const group = this.reflector.getAllAndOverride<string | undefined>(
      RATE_LIMIT_GROUP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (group && GROUP_RATE_LIMITS[group]) {
      const groupConfig = GROUP_RATE_LIMITS[group];
      const identifier = request.user?.agencyId ?? request.ip ?? "anonymous";
      return {
        key: `${RATE_LIMIT_PREFIX}group:${group}:${identifier}`,
        limit: groupConfig.limit,
        windowSec: groupConfig.windowSec,
      };
    }

    // 3. Fall back to per-plan tenant limit
    const plan = request.user?.plan ?? "FREE";
    const planConfig = PLAN_RATE_LIMITS[plan.toUpperCase()] ?? DEFAULT_RATE_LIMIT;
    const tenantId = request.user?.agencyId ?? request.ip ?? "anonymous";

    return {
      key: `${RATE_LIMIT_PREFIX}tenant:${tenantId}`,
      limit: planConfig.limit,
      windowSec: planConfig.windowSec,
    };
  }
}
