import { Injectable, Logger } from "@nestjs/common";
import {
  AnalyticsSnapshot,
  MetricType,
  PostStatus,
  SocialPlatform,
} from "@social-pro/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface PlatformBreakdownEntry {
  platform: string;
  followers: number;
  followerChange: number;
  engagementRate: number;
  impressions: number;
}

export interface TopPostEntry {
  id: string;
  platform: string;
  content: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface OverviewMetrics {
  totalFollowers: number;
  followerChange: number;
  engagementRate: number;
  engagementRateChange: number;
  totalImpressions: number;
  impressionChange: number;
  postsPublished: number;
  postsChange: number;
  accountCount: number;
  platformBreakdown: PlatformBreakdownEntry[];
  topPosts: TopPostEntry[];
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

  async getOverview(
    agencyId: string,
    dateRange: DateRange = {}
  ): Promise<OverviewMetrics> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { agencyId, isActive: true },
      select: { id: true, platform: true, metadata: true },
    });

    const accountCount = accounts.length;

    if (accountCount === 0) {
      return this.emptyOverview();
    }

    const accountIds = accounts.map((a) => a.id);

    const start =
      dateRange.startDate != null ? new Date(dateRange.startDate) : null;
    const end = dateRange.endDate != null ? new Date(dateRange.endDate) : null;

    // Pull post targets for the agency's accounts (with post + account info)
    // so we can derive followers/engagement/impressions/top posts.
    const targets = await this.prisma.postTarget.findMany({
      where: { socialAccountId: { in: accountIds } },
      select: {
        id: true,
        socialAccountId: true,
        platformSpecificContent: true,
        publishedAt: true,
        socialAccount: { select: { platform: true } },
        post: { select: { id: true, content: true, publishedAt: true } },
      },
    });

    // --- Followers per platform (from account metadata) -------------------
    const followersByPlatform = new Map<SocialPlatform, number>();
    for (const acc of accounts) {
      const meta =
        acc.metadata != null && typeof acc.metadata === "object"
          ? (acc.metadata as Record<string, unknown>)
          : {};
      const followers =
        typeof meta["followersCount"] === "number" ? meta["followersCount"] : 0;
      followersByPlatform.set(
        acc.platform,
        (followersByPlatform.get(acc.platform) ?? 0) + followers
      );
    }

    // --- Engagement / impressions per platform (from post targets) --------
    interface PlatformAgg {
      posts: number;
      likes: number;
      comments: number;
      impressions: number;
    }
    const aggByPlatform = new Map<SocialPlatform, PlatformAgg>();
    for (const t of targets) {
      const platform = t.socialAccount.platform;
      const agg =
        aggByPlatform.get(platform) ??
        ({ posts: 0, likes: 0, comments: 0, impressions: 0 } as PlatformAgg);
      const psc = this.asMetricMap(t.platformSpecificContent);
      agg.posts += 1;
      agg.likes += this.numField(psc, "likes");
      agg.comments += this.numField(psc, "comments");
      agg.impressions += this.numField(psc, "impressions");
      aggByPlatform.set(platform, agg);
    }

    // --- Platform breakdown ------------------------------------------------
    const platforms = new Set<SocialPlatform>([
      ...followersByPlatform.keys(),
      ...aggByPlatform.keys(),
    ]);

    const platformBreakdown: PlatformBreakdownEntry[] = [];
    let totalFollowers = 0;
    let totalImpressions = 0;
    let totalInteractions = 0;
    let totalPosts = 0;

    for (const platform of platforms) {
      const followers = followersByPlatform.get(platform) ?? 0;
      const agg =
        aggByPlatform.get(platform) ??
        ({ posts: 0, likes: 0, comments: 0, impressions: 0 } as PlatformAgg);

      totalFollowers += followers;
      totalImpressions += agg.impressions;
      totalInteractions += agg.likes + agg.comments;
      totalPosts += agg.posts;

      platformBreakdown.push({
        platform: platform.toLowerCase(),
        followers,
        followerChange: 0,
        engagementRate: this.computeEngagementRate(
          agg.likes + agg.comments,
          agg.posts,
          followers
        ),
        impressions: agg.impressions,
      });
    }

    const engagementRate = this.computeEngagementRate(
      totalInteractions,
      totalPosts,
      totalFollowers
    );

    // --- Posts published in range -----------------------------------------
    const postsPublished = await this.prisma.post.count({
      where: {
        agencyId,
        status: PostStatus.PUBLISHED,
        ...(start != null || end != null
          ? {
              publishedAt: {
                ...(start != null && { gte: start }),
                ...(end != null && { lte: end }),
              },
            }
          : {}),
      },
    });

    // --- Top posts (by likes + comments) ----------------------------------
    const topPosts: TopPostEntry[] = targets
      .map((t) => {
        const psc = this.asMetricMap(t.platformSpecificContent);
        const likes = this.numField(psc, "likes");
        const comments = this.numField(psc, "comments");
        const shares = this.numField(psc, "shares");
        const impressions = this.numField(psc, "impressions");
        const published = t.publishedAt ?? t.post.publishedAt ?? null;
        return {
          id: t.post.id,
          platform: t.socialAccount.platform.toLowerCase(),
          content: this.extractContentText(t.post.content),
          publishedAt: published != null ? published.toISOString() : "",
          likes,
          comments,
          shares,
          engagementRate: this.computeEngagementRate(
            likes + comments,
            1,
            impressions
          ),
          score: likes + comments,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score: _score, ...rest }) => rest);

    this.logger.debug(
      `Overview agencyId=${agencyId} accounts=${accountCount} followers=${totalFollowers}`
    );

    return {
      totalFollowers,
      followerChange: 0,
      engagementRate,
      engagementRateChange: 0,
      totalImpressions,
      impressionChange: 0,
      postsPublished,
      postsChange: 0,
      accountCount,
      platformBreakdown,
      topPosts,
    };
  }

  private emptyOverview(): OverviewMetrics {
    return {
      totalFollowers: 0,
      followerChange: 0,
      engagementRate: 0,
      engagementRateChange: 0,
      totalImpressions: 0,
      impressionChange: 0,
      postsPublished: 0,
      postsChange: 0,
      accountCount: 0,
      platformBreakdown: [],
      topPosts: [],
    };
  }

  private asMetricMap(value: unknown): Record<string, unknown> {
    return value != null && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  }

  private numField(map: Record<string, unknown>, key: string): number {
    const v = map[key];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  }

  /**
   * Engagement rate = average interactions per post ÷ followers × 100.
   * Returns 0 when followers or posts is 0 (avoids divide-by-zero / inflation).
   */
  private computeEngagementRate(
    interactions: number,
    posts: number,
    denominator: number
  ): number {
    if (posts <= 0 || denominator <= 0) return 0;
    const rate = (interactions / posts / denominator) * 100;
    return Number(rate.toFixed(2));
  }

  private extractContentText(content: unknown): string {
    const map = this.asMetricMap(content);
    const text = map["text"];
    return typeof text === "string" ? text : "";
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
