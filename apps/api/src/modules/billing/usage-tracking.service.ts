import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { UsageMetric } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricUsage {
  metric: UsageMetric;
  used: number;
  limit: number | null;
  withinLimit: boolean;
}

export interface AgencyUsage {
  agencyId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: MetricUsage[];
}

// ---------------------------------------------------------------------------
// Plan limit field mapping
// ---------------------------------------------------------------------------

type PlanLimitKey =
  | "maxSocialAccounts"
  | "maxClients"
  | "maxTeamMembers"
  | "maxScheduledPostsPerMonth"
  | "aiCreditsPerMonth"
  | "storageLimitGb";

const METRIC_TO_PLAN_LIMIT: Partial<Record<UsageMetric, PlanLimitKey>> = {
  [UsageMetric.SOCIAL_ACCOUNTS]: "maxSocialAccounts",
  [UsageMetric.CLIENTS]: "maxClients",
  [UsageMetric.TEAM_MEMBERS]: "maxTeamMembers",
  [UsageMetric.POSTS_PUBLISHED]: "maxScheduledPostsPerMonth",
  [UsageMetric.AI_GENERATIONS]: "aiCreditsPerMonth",
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Increment usage
  // ---------------------------------------------------------------------------

  async incrementUsage(
    agencyId: string,
    metric: UsageMetric,
    amount = 1
  ): Promise<void> {
    const { periodStart, periodEnd } = this.currentPeriod();

    await this.prisma.usageRecord.upsert({
      where: {
        // Composite unique is not defined in schema; use findFirst + update pattern
        // Prisma does not auto-generate an upsert key from composite index.
        // We fall back to raw upsert using a manual approach.
        id: "placeholder-never-matches",
      },
      create: {
        agencyId,
        metric,
        value: BigInt(amount),
        periodStart,
        periodEnd,
      },
      update: {},
    }).catch(() => {
      // Upsert by composite key is not available without @@unique on the model.
      // Use a safe findFirst + update/create pattern instead.
    });

    // Safe upsert: find the record for this period, update if exists, create otherwise
    const existing = await this.prisma.usageRecord.findFirst({
      where: { agencyId, metric, periodStart, periodEnd },
    });

    if (existing) {
      await this.prisma.usageRecord.update({
        where: { id: existing.id },
        data: { value: { increment: BigInt(amount) } },
      });
    } else {
      await this.prisma.usageRecord.create({
        data: {
          agencyId,
          metric,
          value: BigInt(amount),
          periodStart,
          periodEnd,
        },
      });
    }

    this.logger.debug(
      `Usage incremented: agencyId=${agencyId} metric=${metric} amount=${amount}`
    );
  }

  // ---------------------------------------------------------------------------
  // Get usage for all metrics
  // ---------------------------------------------------------------------------

  async getUsage(agencyId: string): Promise<AgencyUsage> {
    const { periodStart, periodEnd } = this.currentPeriod();

    const [records, agency] = await Promise.all([
      this.prisma.usageRecord.findMany({
        where: { agencyId, periodStart, periodEnd },
      }),
      this.prisma.agency.findUnique({
        where: { id: agencyId },
        include: { plan: true },
      }),
    ]);

    const usedByMetric = new Map<UsageMetric, number>(
      records.map((r) => [r.metric, Number(r.value)])
    );

    const plan = agency?.plan ?? null;

    const metrics: MetricUsage[] = Object.values(UsageMetric).map((metric) => {
      const used = usedByMetric.get(metric) ?? 0;
      const limitKey = METRIC_TO_PLAN_LIMIT[metric];
      const limit = plan && limitKey ? (plan[limitKey] as number) : null;
      return {
        metric,
        used,
        limit,
        withinLimit: limit === null ? true : used <= limit,
      };
    });

    return { agencyId, periodStart, periodEnd, metrics };
  }

  // ---------------------------------------------------------------------------
  // Check if a metric is within limit
  // ---------------------------------------------------------------------------

  async checkLimit(agencyId: string, metric: UsageMetric): Promise<boolean> {
    const usage = await this.getUsage(agencyId);
    const metricUsage = usage.metrics.find((m) => m.metric === metric);
    return metricUsage?.withinLimit ?? true;
  }

  // ---------------------------------------------------------------------------
  // Assert limit (throws if exceeded)
  // ---------------------------------------------------------------------------

  async assertLimit(agencyId: string, metric: UsageMetric): Promise<void> {
    const withinLimit = await this.checkLimit(agencyId, metric);
    if (!withinLimit) {
      throw new BadRequestException(
        `Plan limit reached for metric '${metric}'. Upgrade your plan to continue.`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Reset monthly usage (cron target — call from a scheduled job)
  // ---------------------------------------------------------------------------

  async resetMonthlyUsage(): Promise<void> {
    const { periodStart, periodEnd } = this.previousPeriod();

    // We do not delete historical records — they are useful for billing audits.
    // This method is a no-op in the current design since records are period-scoped.
    // If you want to clear stale current-period records, uncomment below:
    //
    // await this.prisma.usageRecord.deleteMany({
    //   where: { periodStart: { lt: periodStart } },
    // });

    this.logger.log(
      `resetMonthlyUsage called: previous period ${periodStart.toISOString()} — ${periodEnd.toISOString()}`
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private currentPeriod(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { periodStart, periodEnd };
  }

  private previousPeriod(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { periodStart, periodEnd };
  }
}
