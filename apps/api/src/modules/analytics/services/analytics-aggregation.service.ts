import { Injectable, Logger } from "@nestjs/common";
import {
  AnalyticsSnapshot,
  MetricType,
  PostStatus,
  SocialPlatform,
} from "@social-pro/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TimeSeriesMetric } from "../dto/timeseries-query.dto";

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
  clientId?: string;
}

export interface TimeSeriesQuery {
  metric: TimeSeriesMetric;
  startDate?: string;
  endDate?: string;
  clientId?: string;
}

export interface TimeSeriesDatum {
  date: string;
  value: number;
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
    const { clientId } = dateRange;

    const accounts = await this.prisma.socialAccount.findMany({
      where: { agencyId, isActive: true, ...(clientId ? { clientId } : {}) },
      select: { id: true, platform: true, metadata: true },
    });

    const accountCount = accounts.length;

    if (accountCount === 0) {
      return this.emptyOverview();
    }

    const accountIds = accounts.map((a) => a.id);

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

    // --- Posts published ---------------------------------------------------
    // The other overview metrics (impressions, engagement, top posts) are
    // computed all-time because we don't yet keep historical snapshots. Count
    // published posts the same way so all cards are consistent — otherwise the
    // narrow default range (last 7 days) shows 0 while impressions/engagement
    // reflect all-time data, which reads as a bug. When `start` is provided we
    // still honour it, but fall back to all-time when the range would
    // contradict the rest of the (un-ranged) metrics.
    // When scoped to a brand, count posts published THROUGH that brand's
    // accounts (via their targets) rather than Post.clientId — consistent with
    // followers/engagement/top-posts, which are all derived from the brand's
    // accounts. Synced historical posts carry a target on the account but no
    // direct clientId, so the target-based count is what users expect.
    const postsPublished = await this.prisma.post.count({
      where: {
        agencyId,
        status: PostStatus.PUBLISHED,
        ...(clientId
          ? { targets: { some: { socialAccount: { clientId } } } }
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

    // --- Deltas (period-over-period) ---------------------------------------
    const followerChange = await this.computeFollowerChange(
      accountIds,
      totalFollowers,
      dateRange
    );

    const { impressionChange, engagementRateChange } =
      await this.computePostBucketDeltas(accountIds, dateRange);

    this.logger.debug(
      `Overview agencyId=${agencyId} accounts=${accountCount} followers=${totalFollowers}`
    );

    return {
      totalFollowers,
      followerChange,
      engagementRate,
      engagementRateChange,
      totalImpressions,
      impressionChange,
      postsPublished,
      postsChange: 0,
      accountCount,
      platformBreakdown,
      topPosts,
    };
  }

  /**
   * Follower delta: % change between the current total and the earliest
   * FOLLOWERS snapshot total within the range (one latest snapshot per account
   * per day, summed across accounts). Falls back to the snapshot total just
   * before the range start when no in-range baseline exists. Returns 0 when
   * fewer than two distinct data points are available.
   */
  private async computeFollowerChange(
    accountIds: string[],
    currentTotal: number,
    dateRange: DateRange
  ): Promise<number> {
    if (accountIds.length === 0) return 0;

    const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
    const end = dateRange.endDate ? new Date(dateRange.endDate) : null;

    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: {
        socialAccountId: { in: accountIds },
        metricType: MetricType.FOLLOWERS,
        postTargetId: null,
        ...(start || end
          ? {
              periodStart: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {}),
      },
      select: { socialAccountId: true, periodStart: true, value: true },
      orderBy: { periodStart: "asc" },
    });

    if (snapshots.length === 0) return 0;

    const days = new Set(
      snapshots.map((s) => this.dayKey(s.periodStart))
    );
    if (days.size < 2) return 0;

    const earliestDay = this.dayKey(snapshots[0]!.periodStart);
    const latestByAccount = new Map<string, number>();
    for (const s of snapshots) {
      if (this.dayKey(s.periodStart) === earliestDay) {
        latestByAccount.set(s.socialAccountId, Number(s.value));
      }
    }

    let baseline = 0;
    for (const v of latestByAccount.values()) baseline += v;

    if (baseline <= 0) return 0;
    return this.percentChange(baseline, currentTotal);
  }

  /**
   * Impression + engagement deltas computed from post targets bucketed by the
   * post's publishedAt day — this range vs the previous equal-length range.
   * Returns 0 for either metric when there is insufficient history.
   */
  private async computePostBucketDeltas(
    accountIds: string[],
    dateRange: DateRange
  ): Promise<{ impressionChange: number; engagementRateChange: number }> {
    if (accountIds.length === 0) {
      return { impressionChange: 0, engagementRateChange: 0 };
    }

    const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
    const start = dateRange.startDate
      ? new Date(dateRange.startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const spanMs = end.getTime() - start.getTime();
    if (spanMs <= 0) return { impressionChange: 0, engagementRateChange: 0 };

    const prevStart = new Date(start.getTime() - spanMs);
    const prevEnd = start;

    const [current, previous] = await Promise.all([
      this.postWindowAgg(accountIds, start, end),
      this.postWindowAgg(accountIds, prevStart, prevEnd),
    ]);

    if (current.posts === 0 && previous.posts === 0) {
      return { impressionChange: 0, engagementRateChange: 0 };
    }

    const impressionChange = this.percentChange(
      previous.impressions,
      current.impressions
    );

    const curEngagement = this.engagementForWindow(current);
    const prevEngagement = this.engagementForWindow(previous);
    const engagementRateChange = this.percentChange(
      prevEngagement,
      curEngagement
    );

    return { impressionChange, engagementRateChange };
  }

  private async postWindowAgg(
    accountIds: string[],
    start: Date,
    end: Date
  ): Promise<{
    posts: number;
    likes: number;
    comments: number;
    impressions: number;
  }> {
    const targets = await this.prisma.postTarget.findMany({
      where: {
        socialAccountId: { in: accountIds },
        publishedAt: { gte: start, lt: end },
      },
      select: { platformSpecificContent: true },
    });

    let posts = 0;
    let likes = 0;
    let comments = 0;
    let impressions = 0;
    for (const t of targets) {
      const psc = this.asMetricMap(t.platformSpecificContent);
      posts += 1;
      likes += this.numField(psc, "likes");
      comments += this.numField(psc, "comments");
      impressions += this.numField(psc, "impressions");
    }
    return { posts, likes, comments, impressions };
  }

  /**
   * Engagement for a window: interactions ÷ impressions × 100. Falls back to 0
   * when there are no impressions (avoids divide-by-zero).
   */
  private engagementForWindow(window: {
    likes: number;
    comments: number;
    impressions: number;
  }): number {
    if (window.impressions <= 0) return 0;
    const rate =
      ((window.likes + window.comments) / window.impressions) * 100;
    return Number(rate.toFixed(2));
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
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
  // Agency/brand time series
  // ---------------------------------------------------------------------------

  /**
   * Returns one point per day (ascending) for the agency's accounts:
   *  - FOLLOWERS: from snapshots — latest snapshot per account per day, summed.
   *  - IMPRESSIONS: from post targets bucketed by publishedAt day — summed.
   *  - ENGAGEMENT: from the same buckets — interactions ÷ impressions × 100.
   */
  async getTimeSeries(
    agencyId: string,
    query: TimeSeriesQuery
  ): Promise<TimeSeriesDatum[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        agencyId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
      },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length === 0) return [];

    const start = query.startDate ? new Date(query.startDate) : null;
    const end = query.endDate ? new Date(query.endDate) : null;

    if (query.metric === "FOLLOWERS") {
      return this.followersTimeSeries(accountIds, start, end);
    }
    return this.postBucketTimeSeries(accountIds, query.metric, start, end);
  }

  private async followersTimeSeries(
    accountIds: string[],
    start: Date | null,
    end: Date | null
  ): Promise<TimeSeriesDatum[]> {
    const snapshots = await this.prisma.analyticsSnapshot.findMany({
      where: {
        socialAccountId: { in: accountIds },
        metricType: MetricType.FOLLOWERS,
        postTargetId: null,
        ...(start || end
          ? {
              periodStart: {
                ...(start ? { gte: start } : {}),
                ...(end ? { lte: end } : {}),
              },
            }
          : {}),
      },
      select: { socialAccountId: true, periodStart: true, value: true },
      orderBy: { periodStart: "asc" },
    });

    // For each (day, account) keep the latest value, then sum per day.
    const perDayAccount = new Map<string, Map<string, number>>();
    for (const s of snapshots) {
      const day = this.dayKey(s.periodStart);
      const byAccount = perDayAccount.get(day) ?? new Map<string, number>();
      byAccount.set(s.socialAccountId, Number(s.value));
      perDayAccount.set(day, byAccount);
    }

    return [...perDayAccount.entries()]
      .map(([date, byAccount]) => {
        let value = 0;
        for (const v of byAccount.values()) value += v;
        return { date, value };
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  private async postBucketTimeSeries(
    accountIds: string[],
    metric: TimeSeriesMetric,
    start: Date | null,
    end: Date | null
  ): Promise<TimeSeriesDatum[]> {
    const targets = await this.prisma.postTarget.findMany({
      where: {
        socialAccountId: { in: accountIds },
        publishedAt: {
          not: null,
          ...(start ? { gte: start } : {}),
          ...(end ? { lte: end } : {}),
        },
      },
      select: { publishedAt: true, platformSpecificContent: true },
    });

    interface Bucket {
      likes: number;
      comments: number;
      impressions: number;
    }
    const byDay = new Map<string, Bucket>();
    for (const t of targets) {
      if (t.publishedAt == null) continue;
      const day = this.dayKey(t.publishedAt);
      const bucket =
        byDay.get(day) ?? { likes: 0, comments: 0, impressions: 0 };
      const psc = this.asMetricMap(t.platformSpecificContent);
      bucket.likes += this.numField(psc, "likes");
      bucket.comments += this.numField(psc, "comments");
      bucket.impressions += this.numField(psc, "impressions");
      byDay.set(day, bucket);
    }

    return [...byDay.entries()]
      .map(([date, bucket]) => {
        const value =
          metric === "IMPRESSIONS"
            ? bucket.impressions
            : this.engagementForWindow(bucket);
        return { date, value };
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
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
