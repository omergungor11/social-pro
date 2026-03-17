import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UsageMetric } from "@social-pro/prisma";
import { Request } from "express";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";
import { UsageTrackingService } from "../usage-tracking.service";

// ---------------------------------------------------------------------------
// Decorator
// ---------------------------------------------------------------------------

export const PLAN_LIMIT_METRIC_KEY = "planLimitMetric";

/**
 * Attach to a controller method to enforce plan limits before the handler runs.
 *
 * Example:
 *   @PlanLimit(UsageMetric.SOCIAL_ACCOUNTS)
 *   @Post()
 *   async create(...) {}
 */
export const PlanLimit = (metric: UsageMetric): MethodDecorator =>
  SetMetadata(PLAN_LIMIT_METRIC_KEY, metric);

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Checks whether the requesting agency is within the plan limit for the
 * metric declared on the route via @PlanLimit(UsageMetric.XYZ).
 *
 * If no metric is declared, the guard passes through.
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageTracking: UsageTrackingService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<UsageMetric | undefined>(
      PLAN_LIMIT_METRIC_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!metric) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();

    const agencyId = request.user?.agencyId;

    if (!agencyId) {
      // Let the auth guard handle missing auth; do not block here
      return true;
    }

    // assertLimit throws BadRequestException when the limit is exceeded
    await this.usageTracking.assertLimit(agencyId, metric);

    return true;
  }
}
