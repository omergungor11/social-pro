import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  AnalyticsSnapshot,
  MetricType,
  Prisma,
  SocialPlatform,
} from "@social-pro/prisma";
import { PrismaService } from "../../common/prisma/prisma.service";

// ---------------------------------------------------------------------------
// Platform metrics shapes (simplified)
// ---------------------------------------------------------------------------

interface PlatformAccountMetrics {
  followers: number;
  engagementRate: number;
  impressions: number;
}

interface PlatformPostMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  clicks: number;
  views: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Fetches metrics from social platform APIs and persists AnalyticsSnapshot records.
 *
 * Each platform method stubs the real API call pattern. Wire real platform
 * SDKs/HTTP clients here as OAuth tokens are available via SocialAccount.
 */
@Injectable()
export class AnalyticsFetcherService {
  private readonly logger = new Logger(AnalyticsFetcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // On-demand snapshot for an agency
  // ---------------------------------------------------------------------------

  /**
   * Snapshots all active accounts for an agency immediately (best-effort) so
   * charts have a data point without waiting for the 6h cron.
   */
  async snapshotAgencyNow(agencyId: string): Promise<{ snapshotted: number }> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { agencyId, isActive: true },
      select: { id: true },
    });

    if (accounts.length === 0) return { snapshotted: 0 };

    const results = await Promise.allSettled(
      accounts.map(async (a) => {
        const snaps = await this.fetchAccountMetrics(a.id);
        // Seed a flat baseline for the prior days so the growth charts render
        // as a real line immediately; real daily values replace it over time.
        await this.backfillBaseline(a.id, 14);
        return snaps;
      })
    );

    const snapshotted = results.filter(
      (r) => r.status === "fulfilled"
    ).length;

    const failed = results.length - snapshotted;
    if (failed > 0) {
      this.logger.warn(
        `snapshotAgencyNow agencyId=${agencyId}: ${snapshotted} ok, ${failed} failed`
      );
    }

    return { snapshotted };
  }

  /**
   * Snapshots a single account immediately and seeds a 14-day flat baseline so
   * its growth charts render right after the account is connected. Best-effort:
   * mirrors the per-account body of snapshotAgencyNow for one account.
   */
  async snapshotAccountNow(accountId: string): Promise<AnalyticsSnapshot[]> {
    const snaps = await this.fetchAccountMetrics(accountId);
    await this.backfillBaseline(accountId, 14);
    return snaps;
  }

  /**
   * Creates flat baseline snapshots for the prior `days` days at the account's
   * current metric values, but only where a snapshot is missing — so it never
   * overwrites a real day. This gives the growth charts a visible line on day
   * one; genuine daily values accumulate over time and replace the baseline.
   */
  private async backfillBaseline(accountId: string, days: number): Promise<void> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: { metadata: true },
    });
    if (!account) return;

    const m = await this.computeAccountMetricsFromDb(accountId, account.metadata);
    const entries: Array<[MetricType, bigint]> = [
      [MetricType.FOLLOWERS, BigInt(Math.round(m.followers))],
      [MetricType.ENGAGEMENT, BigInt(Math.round(m.engagementRate * 100))],
      [MetricType.IMPRESSIONS, BigInt(Math.round(m.impressions))],
    ];

    const now = new Date();
    for (let d = 1; d <= days; d += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
      for (const [metricType, value] of entries) {
        const existing = await this.prisma.analyticsSnapshot.findFirst({
          where: { socialAccountId: accountId, postTargetId: null, metricType, periodStart: day },
          select: { id: true },
        });
        if (existing) continue;
        await this.prisma.analyticsSnapshot.create({
          data: { socialAccountId: accountId, metricType, value, periodStart: day, periodEnd: day },
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fetch account-level metrics
  // ---------------------------------------------------------------------------

  async fetchAccountMetrics(accountId: string): Promise<AnalyticsSnapshot[]> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`SocialAccount '${accountId}' not found`);
    }

    this.logger.log(
      `Computing account metrics: accountId=${accountId} platform=${account.platform}`
    );

    const metrics = await this.computeAccountMetricsFromDb(accountId, account.metadata);

    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getFullYear(),
      periodEnd.getMonth(),
      periodEnd.getDate()
    );

    const rawData: Prisma.InputJsonValue = {
      followers: metrics.followers,
      engagementRate: metrics.engagementRate,
      impressions: metrics.impressions,
    };

    const entries: Array<{ metricType: MetricType; value: bigint }> = [
      { metricType: MetricType.FOLLOWERS, value: BigInt(metrics.followers) },
      {
        metricType: MetricType.ENGAGEMENT,
        value: BigInt(Math.round(metrics.engagementRate * 100)),
      },
      { metricType: MetricType.IMPRESSIONS, value: BigInt(metrics.impressions) },
    ];

    const snapshots = await Promise.all(
      entries.map(({ metricType, value }) =>
        this.upsertDailySnapshot(
          accountId,
          metricType,
          value,
          periodStart,
          periodEnd,
          rawData
        )
      )
    );

    // Update the lastSyncedAt timestamp on the account
    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(
      `Saved ${snapshots.length} account snapshots for accountId=${accountId}`
    );

    return snapshots;
  }

  /**
   * Computes the three account-level metrics from the database, mirroring the
   * derivation used by SocialAccountService.listAccounts / overview:
   *  - followers   = metadata.followersCount
   *  - impressions = sum of platformSpecificContent.impressions across targets
   *  - engagement  = (avgInteractionsPerPost / followers) * 100
   */
  private async computeAccountMetricsFromDb(
    accountId: string,
    metadata: Prisma.JsonValue
  ): Promise<PlatformAccountMetrics> {
    const meta =
      metadata != null && typeof metadata === "object"
        ? (metadata as Record<string, unknown>)
        : {};
    const followers =
      typeof meta["followersCount"] === "number" ? meta["followersCount"] : 0;

    const targets = await this.prisma.postTarget.findMany({
      where: { socialAccountId: accountId },
      select: { platformSpecificContent: true },
    });

    let posts = 0;
    let likes = 0;
    let comments = 0;
    let impressions = 0;
    for (const t of targets) {
      const psc =
        t.platformSpecificContent != null &&
        typeof t.platformSpecificContent === "object"
          ? (t.platformSpecificContent as Record<string, unknown>)
          : {};
      posts += 1;
      likes += typeof psc["likes"] === "number" ? psc["likes"] : 0;
      comments += typeof psc["comments"] === "number" ? psc["comments"] : 0;
      impressions +=
        typeof psc["impressions"] === "number" ? psc["impressions"] : 0;
    }

    const avgInteractionsPerPost =
      posts > 0 ? (likes + comments) / posts : 0;
    const engagementRate =
      followers > 0 ? (avgInteractionsPerPost / followers) * 100 : 0;

    return { followers, engagementRate, impressions };
  }

  /**
   * Keeps a single snapshot per (account, metric, day): updates the existing
   * row's value + fetchedAt when present, otherwise creates a new one. This
   * prevents the 6h cron from accumulating four rows per metric per day.
   */
  private async upsertDailySnapshot(
    socialAccountId: string,
    metricType: MetricType,
    value: bigint,
    periodStart: Date,
    periodEnd: Date,
    rawData: Prisma.InputJsonValue
  ): Promise<AnalyticsSnapshot> {
    const existing = await this.prisma.analyticsSnapshot.findFirst({
      where: { socialAccountId, postTargetId: null, metricType, periodStart },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.analyticsSnapshot.update({
        where: { id: existing.id },
        data: { value, periodEnd, rawData, fetchedAt: new Date() },
      });
    }

    return this.prisma.analyticsSnapshot.create({
      data: {
        socialAccountId,
        metricType,
        value,
        periodStart,
        periodEnd,
        rawData,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Fetch post-level metrics
  // ---------------------------------------------------------------------------

  async fetchPostMetrics(postTargetId: string): Promise<AnalyticsSnapshot[]> {
    const postTarget = await this.prisma.postTarget.findUnique({
      where: { id: postTargetId },
      include: { socialAccount: true },
    });

    if (!postTarget) {
      throw new NotFoundException(`PostTarget '${postTargetId}' not found`);
    }

    if (!postTarget.platformPostId) {
      this.logger.warn(
        `PostTarget '${postTargetId}' has no platformPostId — skipping metrics fetch`
      );
      return [];
    }

    this.logger.log(
      `Fetching post metrics: postTargetId=${postTargetId} platform=${postTarget.socialAccount.platform}`
    );

    const metrics = await this.callPlatformPostApi(
      postTarget.socialAccount.platform,
      postTarget.platformPostId,
      postTarget.socialAccount.accessToken
    );

    const periodEnd = new Date();
    const periodStart = postTarget.publishedAt ?? periodEnd;

    const metricEntries: Array<[MetricType, number]> = [
      [MetricType.LIKES, metrics.likes],
      [MetricType.COMMENTS, metrics.comments],
      [MetricType.SHARES, metrics.shares],
      [MetricType.SAVES, metrics.saves],
      [MetricType.IMPRESSIONS, metrics.impressions],
      [MetricType.REACH, metrics.reach],
      [MetricType.CLICKS, metrics.clicks],
      [MetricType.VIEWS, metrics.views],
    ];

    const snapshots = await this.prisma.$transaction(
      metricEntries.map(([metricType, value]) =>
        this.prisma.analyticsSnapshot.create({
          data: {
            socialAccountId: postTarget.socialAccountId,
            postTargetId,
            metricType,
            value: BigInt(value),
            periodStart,
            periodEnd,
            rawData: metrics as unknown as Prisma.InputJsonValue,
          },
        })
      )
    );

    this.logger.log(
      `Saved ${snapshots.length} post snapshots for postTargetId=${postTargetId}`
    );

    return snapshots;
  }

  // ---------------------------------------------------------------------------
  // Platform API stub helpers
  // ---------------------------------------------------------------------------

  /**
   * Calls the relevant platform API to retrieve post-level metrics.
   */
  private async callPlatformPostApi(
    platform: SocialPlatform,
    platformPostId: string,
    _accessToken: string
  ): Promise<PlatformPostMetrics> {
    this.logger.debug(
      `callPlatformPostApi: platform=${platform} platformPostId=${platformPostId}`
    );

    // Stub: return simulated metrics. Replace with real platform API calls.
    return Promise.resolve({
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      views: 0,
    });
  }
}
