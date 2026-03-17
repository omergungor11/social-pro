import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AnalyticsFetcherService } from "../services/analytics-fetcher.service";

export const ANALYTICS_FETCH_QUEUE = "analytics-fetch";
export const ANALYTICS_FETCH_JOB_NAME = "fetch-all-account-metrics";

/**
 * Periodic analytics fetch job.
 *
 * Runs every 6 hours (via BullMQ repeat). For each active SocialAccount in the
 * system it calls the AnalyticsFetcherService to pull current metrics from the
 * platform and persist AnalyticsSnapshot records.
 *
 * Errors for individual accounts are caught and logged; the batch continues.
 * This ensures one failing account does not block the entire run.
 *
 * Wire up as a BullMQ processor in analytics.module.ts:
 *
 *   @Processor(ANALYTICS_FETCH_QUEUE)
 *   class AnalyticsFetchProcessor extends WorkerHost {
 *     async process(job: Job): Promise<void> {
 *       await this.analyticsFetchJob.run();
 *     }
 *   }
 *
 * Repeat schedule: every 6 hours → cron pattern "0 * /6 * * *"
 */
@Injectable()
export class AnalyticsFetchJob {
  private readonly logger = new Logger(AnalyticsFetchJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: AnalyticsFetcherService
  ) {}

  async run(): Promise<void> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { isActive: true },
      select: { id: true, agencyId: true, platform: true },
    });

    if (accounts.length === 0) {
      this.logger.debug("No active social accounts found — skipping fetch");
      return;
    }

    this.logger.log(
      `Starting analytics fetch for ${accounts.length} active account(s)`
    );

    const results = await Promise.allSettled(
      accounts.map((account) => this.fetcher.fetchAccountMetrics(account.id))
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;

    this.logger.log(
      `Analytics fetch batch complete: ${succeeded} succeeded, ${failed} failed`
    );
  }
}
