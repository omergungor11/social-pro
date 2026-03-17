import { Module } from "@nestjs/common";
import {
  BullModule,
  getQueueToken,
  InjectQueue,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaModule } from "../common/prisma/prisma.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsFetcherService } from "./services/analytics-fetcher.service";
import { AnalyticsAggregationService } from "./services/analytics-aggregation.service";
import { ReportService } from "./services/report.service";
import {
  AnalyticsFetchJob,
  ANALYTICS_FETCH_QUEUE,
  ANALYTICS_FETCH_JOB_NAME,
} from "./jobs/analytics-fetch.job";

// ---------------------------------------------------------------------------
// BullMQ processor
// ---------------------------------------------------------------------------

@Processor(ANALYTICS_FETCH_QUEUE)
class AnalyticsFetchProcessor extends WorkerHost {
  constructor(private readonly analyticsFetchJob: AnalyticsFetchJob) {
    super();
  }

  async process(_job: Job): Promise<void> {
    await this.analyticsFetchJob.run();
  }
}

// ---------------------------------------------------------------------------
// Recurring job registration helper
// ---------------------------------------------------------------------------

async function scheduleRecurringJob(
  queue: import("bullmq").Queue
): Promise<void> {
  await queue.add(
    ANALYTICS_FETCH_JOB_NAME,
    {},
    {
      repeat: { pattern: "0 */6 * * *" }, // every 6 hours
      jobId: `${ANALYTICS_FETCH_JOB_NAME}-recurring`,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    }
  );
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

/**
 * Analytics module.
 *
 * Provides:
 *  - AnalyticsFetcherService: platform metric fetching + AnalyticsSnapshot persistence
 *  - AnalyticsAggregationService: aggregation queries (overview, time series, comparison)
 *  - ReportService: AnalyticsReport CRUD with async data generation
 *  - BullMQ cron job running every 6 h to refresh all account metrics
 *
 * Re-exports InjectQueue for downstream use.
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: parseInt(process.env["REDIS_PORT"] ?? "6379", 10),
        password: process.env["REDIS_PASSWORD"] ?? undefined,
        tls: process.env["REDIS_TLS"] === "true" ? {} : undefined,
      },
    }),
    BullModule.registerQueue({ name: ANALYTICS_FETCH_QUEUE }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsFetcherService,
    AnalyticsAggregationService,
    ReportService,
    AnalyticsFetchJob,
    AnalyticsFetchProcessor,
    {
      provide: "ANALYTICS_QUEUE_INIT",
      useFactory: async (
        queue: import("bullmq").Queue
      ): Promise<void> => scheduleRecurringJob(queue),
      inject: [getQueueToken(ANALYTICS_FETCH_QUEUE)],
    },
  ],
  exports: [AnalyticsFetcherService, AnalyticsAggregationService, ReportService],
})
export class AnalyticsModule {}

export { InjectQueue };
