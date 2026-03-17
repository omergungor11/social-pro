import { Injectable, Logger } from "@nestjs/common";
import { AnalyticsSnapshot, MetricType } from "@social-pro/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface OverviewMetrics {
  agencyId: string;
  totalFollowers: number;
  averageEngagementRate: number;
  totalImpressions: number;
  accountCount: number;
}

export interface TimeSeriesPoint {
  periodStart: Date;
  periodEnd: Date;
  metricType: MetricType;
  value: number;
}

export interface PostMetricsSummary {
  postTargetId: string;
  metrics: Array<{ metricType: MetricType; value: number; fetchedAt: Date }>;
}

export interface PeriodComparison {
  agencyId: string;
  period1: { start: Date; end: Date; followers: number; impressions: number; engagementRate: number };
  period2: { start: Date; end: Date; followers: number; impressions: number; engagementRate: number };
  followersChange: number;
  impressionsChange: number;
  engagementRateChange: number;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AnalyticsAggregationService {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------------

  async getOverview(agencyId: string): Promise<OverviewMetrics> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { agencyId, isActive: true },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);
    const accountCount = accountIds.length;

    if (accountCount === 0) {
      return {
        agencyId,
        totalFollowers: 0,
        averageEngagementRate: 0,
        totalImpressions: 0,
        accountCount: 0,
      };
    }

    // Latest snapshot per account per metric type
    const latestFollowers = await this.latestMetricSum(
      accountIds,
      MetricType.FOLLOWERS
    );
    const latestImpressions = await this.latestMetricSum(
      accountIds,
      MetricType.IMPRESSIONS
    );
    const latestEngagement = await this.latestMetricAvg(
      accountIds,
      MetricType.ENGAGEMENT
    );

    // ENGAGEMENT is stored as basis-points (rate * 100) for integer storage
    const averageEngagementRate = latestEngagement / 100;

    this.logger.debug(
      `Overview agencyId=${agencyId} accounts=${accountCount} followers=${latestFollowers}`
    );

    return {
      agencyId,
      totalFollowers: latestFollowers,
      averageEngagementRate,
      totalImpressions: latestImpressions,
      accountCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Account metrics time series
  // ---------------------------------------------------------------------------

  async getAccountMetrics(
    accountId: string,
    dateRange: DateRange
  ): Promise<TimeSeriesPoint[]> {
    const where = {
      socialAccountId: accountId,
      postTargetId: null,
      ...(dateRange.startDate != null || dateRange.endDate != null
        ? {
            periodStart: {
              ...(dateRange.startDate != null && {
                gte: new Date(dateRange.startDate),
              }),
              ...(dateRange.endDate != null && {
                lte: new Date(dateRange.endDate),
              }),
            },
          }
        : {}),
    };

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where,
      orderBy: { periodStart: "asc" },
    });

    return snapshots.map((s) => this.snapshotToTimePoint(s));
  }

  // ---------------------------------------------------------------------------
  // Post metrics
  // ---------------------------------------------------------------------------

  async getPostMetrics(postTargetId: string): Promise<PostMetricsSummary> {
    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: { postTargetId },
      orderBy: { fetchedAt: "desc" },
    });

    return {
      postTargetId,
      metrics: snapshots.map((s) => ({
        metricType: s.metricType,
        value: Number(s.value),
        fetchedAt: s.fetchedAt,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Period comparison
  // ---------------------------------------------------------------------------

  async compare(
    agencyId: string,
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ): Promise<PeriodComparison> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { agencyId, isActive: true },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const [p1Followers, p1Impressions, p1Engagement] = await Promise.all([
      this.periodMetricSum(accountIds, MetricType.FOLLOWERS, period1Start, period1End),
      this.periodMetricSum(accountIds, MetricType.IMPRESSIONS, period1Start, period1End),
      this.periodMetricAvg(accountIds, MetricType.ENGAGEMENT, period1Start, period1End),
    ]);

    const [p2Followers, p2Impressions, p2Engagement] = await Promise.all([
      this.periodMetricSum(accountIds, MetricType.FOLLOWERS, period2Start, period2End),
      this.periodMetricSum(accountIds, MetricType.IMPRESSIONS, period2Start, period2End),
      this.periodMetricAvg(accountIds, MetricType.ENGAGEMENT, period2Start, period2End),
    ]);

    return {
      agencyId,
      period1: {
        start: period1Start,
        end: period1End,
        followers: p1Followers,
        impressions: p1Impressions,
        engagementRate: p1Engagement / 100,
      },
      period2: {
        start: period2Start,
        end: period2End,
        followers: p2Followers,
        impressions: p2Impressions,
        engagementRate: p2Engagement / 100,
      },
      followersChange: this.percentChange(p1Followers, p2Followers),
      impressionsChange: this.percentChange(p1Impressions, p2Impressions),
      engagementRateChange: this.percentChange(p1Engagement, p2Engagement),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async latestMetricSum(
    accountIds: string[],
    metricType: MetricType
  ): Promise<number> {
    if (accountIds.length === 0) return 0;

    const result = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(value), 0) AS total
      FROM "AnalyticsSnapshot" s
      INNER JOIN (
        SELECT "socialAccountId", MAX("fetchedAt") AS max_fetched
        FROM "AnalyticsSnapshot"
        WHERE "socialAccountId" = ANY(${accountIds}::text[])
          AND "metricType" = ${metricType}::"MetricType"
          AND "postTargetId" IS NULL
        GROUP BY "socialAccountId"
      ) latest ON s."socialAccountId" = latest."socialAccountId"
        AND s."fetchedAt" = latest.max_fetched
        AND s."metricType" = ${metricType}::"MetricType"
    `;

    return Number(result[0]?.total ?? 0n);
  }

  private async latestMetricAvg(
    accountIds: string[],
    metricType: MetricType
  ): Promise<number> {
    if (accountIds.length === 0) return 0;

    const result = await this.prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT COALESCE(AVG(value::float), 0) AS avg
      FROM "AnalyticsSnapshot" s
      INNER JOIN (
        SELECT "socialAccountId", MAX("fetchedAt") AS max_fetched
        FROM "AnalyticsSnapshot"
        WHERE "socialAccountId" = ANY(${accountIds}::text[])
          AND "metricType" = ${metricType}::"MetricType"
          AND "postTargetId" IS NULL
        GROUP BY "socialAccountId"
      ) latest ON s."socialAccountId" = latest."socialAccountId"
        AND s."fetchedAt" = latest.max_fetched
        AND s."metricType" = ${metricType}::"MetricType"
    `;

    return Number(result[0]?.avg ?? 0);
  }

  private async periodMetricSum(
    accountIds: string[],
    metricType: MetricType,
    start: Date,
    end: Date
  ): Promise<number> {
    if (accountIds.length === 0) return 0;

    const result = await this.prisma.analyticsSnapshot.aggregate({
      where: {
        socialAccountId: { in: accountIds },
        metricType,
        postTargetId: null,
        periodStart: { gte: start, lte: end },
      },
      _sum: { value: true },
    });

    return Number(result._sum.value ?? 0n);
  }

  private async periodMetricAvg(
    accountIds: string[],
    metricType: MetricType,
    start: Date,
    end: Date
  ): Promise<number> {
    if (accountIds.length === 0) return 0;

    const result = await this.prisma.analyticsSnapshot.aggregate({
      where: {
        socialAccountId: { in: accountIds },
        metricType,
        postTargetId: null,
        periodStart: { gte: start, lte: end },
      },
      _avg: { value: true },
    });

    return Number(result._avg.value ?? 0);
  }

  private snapshotToTimePoint(s: AnalyticsSnapshot): TimeSeriesPoint {
    return {
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      metricType: s.metricType,
      value: Number(s.value),
    };
  }

  private percentChange(from: number, to: number): number {
    if (from === 0) return to === 0 ? 0 : 100;
    return Math.round(((to - from) / from) * 10000) / 100;
  }
}
