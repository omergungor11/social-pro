import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AnalyticsSnapshot, MetricType, SocialPlatform } from "@social-pro/prisma";
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
      `Fetching account metrics: accountId=${accountId} platform=${account.platform}`
    );

    const metrics = await this.callPlatformAccountApi(
      account.platform,
      account.platformUserId,
      account.accessToken
    );

    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getFullYear(),
      periodEnd.getMonth(),
      periodEnd.getDate()
    );

    const snapshotData: Array<{
      socialAccountId: string;
      metricType: MetricType;
      value: bigint;
      periodStart: Date;
      periodEnd: Date;
      rawData: Record<string, unknown>;
    }> = [
      {
        socialAccountId: accountId,
        metricType: MetricType.FOLLOWERS,
        value: BigInt(metrics.followers),
        periodStart,
        periodEnd,
        rawData: metrics as unknown as Record<string, unknown>,
      },
      {
        socialAccountId: accountId,
        metricType: MetricType.ENGAGEMENT,
        value: BigInt(Math.round(metrics.engagementRate * 100)),
        periodStart,
        periodEnd,
        rawData: metrics as unknown as Record<string, unknown>,
      },
      {
        socialAccountId: accountId,
        metricType: MetricType.IMPRESSIONS,
        value: BigInt(metrics.impressions),
        periodStart,
        periodEnd,
        rawData: metrics as unknown as Record<string, unknown>,
      },
    ];

    const snapshots = await this.prisma.$transaction(
      snapshotData.map((d) =>
        this.prisma.analyticsSnapshot.create({ data: d })
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
            rawData: metrics as unknown as Record<string, unknown>,
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
   * Calls the relevant platform API to retrieve account-level metrics.
   * Replace the stub bodies with actual SDK/HTTP calls when real credentials
   * and platform API integrations are wired up.
   */
  private async callPlatformAccountApi(
    platform: SocialPlatform,
    platformUserId: string,
    accessToken: string
  ): Promise<PlatformAccountMetrics> {
    this.logger.debug(
      `callPlatformAccountApi: platform=${platform} platformUserId=${platformUserId}`
    );

    if (platform === SocialPlatform.INSTAGRAM) {
      try {
        const url =
          `https://graph.facebook.com/v22.0/${platformUserId}` +
          `?fields=followers_count,media_count` +
          `&access_token=${accessToken}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = (await response.json()) as {
            followers_count?: number;
            media_count?: number;
          };
          return {
            followers: data.followers_count ?? 0,
            engagementRate: 0,
            impressions: 0,
          };
        }
        this.logger.warn(`Instagram metrics fetch failed: ${response.status}`);
      } catch (err) {
        this.logger.warn(`Instagram metrics API error: ${String(err)}`);
      }
    }

    if (platform === SocialPlatform.FACEBOOK) {
      try {
        const url =
          `https://graph.facebook.com/v22.0/${platformUserId}` +
          `?fields=followers_count,fan_count` +
          `&access_token=${accessToken}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = (await response.json()) as {
            followers_count?: number;
            fan_count?: number;
          };
          return {
            followers: data.followers_count ?? data.fan_count ?? 0,
            engagementRate: 0,
            impressions: 0,
          };
        }
        this.logger.warn(`Facebook metrics fetch failed: ${response.status}`);
      } catch (err) {
        this.logger.warn(`Facebook metrics API error: ${String(err)}`);
      }
    }

    if (platform === SocialPlatform.TWITTER) {
      try {
        const response = await fetch(
          `https://api.twitter.com/2/users/${platformUserId}?user.fields=public_metrics`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (response.ok) {
          const json = (await response.json()) as {
            data?: { public_metrics?: { followers_count?: number } };
          };
          return {
            followers: json.data?.public_metrics?.followers_count ?? 0,
            engagementRate: 0,
            impressions: 0,
          };
        }
        this.logger.warn(`Twitter metrics fetch failed: ${response.status}`);
      } catch (err) {
        this.logger.warn(`Twitter metrics API error: ${String(err)}`);
      }
    }

    return { followers: 0, engagementRate: 0, impressions: 0 };
  }

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
