import { Module } from "@nestjs/common";
import {
  BullModule,
  getQueueToken,
  InjectQueue,
  Processor,
  WorkerHost,
} from "@nestjs/bullmq";
import { Job } from "bullmq";
import { SocialAccountModule } from "./social-account.module";
import {
  TOKEN_REFRESH_QUEUE,
  TOKEN_REFRESH_JOB_NAME,
  TokenRefreshJob,
  TokenRefreshJobData,
} from "./jobs/token-refresh.job";

export { TOKEN_REFRESH_QUEUE, getQueueToken };

/**
 * BullMQ processor that wires the TokenRefreshJob handler to the queue.
 *
 * Decorated with @Processor so BullMQ registers a worker for the queue.
 * The WorkerHost base class handles worker lifecycle.
 */
@Processor(TOKEN_REFRESH_QUEUE)
class TokenRefreshProcessor extends WorkerHost {
  constructor(private readonly tokenRefreshJob: TokenRefreshJob) {
    super();
  }

  async process(job: Job<TokenRefreshJobData>): Promise<void> {
    await this.tokenRefreshJob.run(job.data);
  }
}

/**
 * Schedules the recurring token-refresh sweep.
 *
 * The job runs every 5 minutes. BullMQ deduplications repeated jobs by the
 * jobId, so multiple API instances will not double-schedule.
 */
async function scheduleRecurringJob(
  queue: import("bullmq").Queue<TokenRefreshJobData>
): Promise<void> {
  await queue.add(
    TOKEN_REFRESH_JOB_NAME,
    {},
    {
      repeat: { pattern: "*/5 * * * *" },
      jobId: `${TOKEN_REFRESH_JOB_NAME}-recurring`,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    }
  );
}

/**
 * Module that registers the BullMQ queue and processor for token refresh.
 *
 * Import this module in AppModule (or alongside SocialAccountModule) to
 * activate the background job. Requires REDIS_HOST / REDIS_PORT env vars
 * (or a REDIS_URL) to be set.
 *
 * The recurring job is registered on module initialization via the
 * QUEUE_INIT_PROVIDER provider, which injects the queue and adds the cron
 * repeat entry.
 */
@Module({
  imports: [
    SocialAccountModule,
    BullModule.forRoot({
      connection: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: parseInt(process.env["REDIS_PORT"] ?? "6379", 10),
        password: process.env["REDIS_PASSWORD"] ?? undefined,
        tls: process.env["REDIS_TLS"] === "true" ? {} : undefined,
      },
    }),
    BullModule.registerQueue({ name: TOKEN_REFRESH_QUEUE }),
  ],
  providers: [
    TokenRefreshProcessor,
    {
      // Schedule the repeating job once the module initialises
      provide: "QUEUE_INIT_PROVIDER",
      useFactory: async (
        queue: import("bullmq").Queue<TokenRefreshJobData>
      ): Promise<void> => scheduleRecurringJob(queue),
      inject: [getQueueToken(TOKEN_REFRESH_QUEUE)],
    },
  ],
})
export class SocialAccountQueueModule {}

/**
 * Convenience re-export so callers can inject the queue if needed.
 * Usage: @InjectQueue(TOKEN_REFRESH_QUEUE) queue: Queue<TokenRefreshJobData>
 */
export { InjectQueue };
