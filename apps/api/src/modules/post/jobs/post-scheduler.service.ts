import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

export const POST_PUBLISH_QUEUE = "post-publish";
export const POST_PUBLISH_JOB = "publish-post";

export interface PostPublishJobData {
  postId: string;
  agencyId: string;
}

/**
 * Manages delayed BullMQ jobs for scheduled post publishing.
 *
 * Each post is mapped to a BullMQ delayed job identified by the jobId
 * `post-publish:{postId}`. Using a deterministic jobId ensures that
 * re-scheduling replaces rather than duplicates the existing job.
 */
@Injectable()
export class PostSchedulerService {
  private readonly logger = new Logger(PostSchedulerService.name);

  constructor(
    @InjectQueue(POST_PUBLISH_QUEUE)
    private readonly queue: Queue<PostPublishJobData>
  ) {}

  /**
   * Schedules a delayed publish job for the given post.
   *
   * @param postId      Post to publish
   * @param agencyId    Owning agency (used by the processor for scoping)
   * @param scheduledAt Target publish timestamp
   */
  async schedulePost(
    postId: string,
    agencyId: string,
    scheduledAt: Date
  ): Promise<void> {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    const jobId = this.buildJobId(postId);

    await this.queue.add(
      POST_PUBLISH_JOB,
      { postId, agencyId },
      {
        jobId,
        delay,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      }
    );

    this.logger.log(
      `Post scheduled: postId=${postId} scheduledAt=${scheduledAt.toISOString()} delayMs=${delay}`
    );
  }

  /**
   * Cancels a previously scheduled publish job.
   * Safe to call even if no job exists for the post.
   *
   * @param postId Post whose scheduled job should be removed
   */
  async cancelScheduledPost(postId: string): Promise<void> {
    const jobId = this.buildJobId(postId);
    const job = await this.queue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Scheduled job cancelled: postId=${postId} jobId=${jobId}`);
    } else {
      this.logger.debug(`No active scheduled job found for postId=${postId}`);
    }
  }

  /**
   * Reschedules a post to a new time.
   * Removes the existing job (if any) and creates a fresh one.
   *
   * @param postId         Post to reschedule
   * @param agencyId       Owning agency
   * @param newScheduledAt New target publish timestamp
   */
  async reschedulePost(
    postId: string,
    agencyId: string,
    newScheduledAt: Date
  ): Promise<void> {
    await this.cancelScheduledPost(postId);
    await this.schedulePost(postId, agencyId, newScheduledAt);

    this.logger.log(
      `Post rescheduled: postId=${postId} newScheduledAt=${newScheduledAt.toISOString()}`
    );
  }

  private buildJobId(postId: string): string {
    return `${POST_PUBLISH_JOB}:${postId}`;
  }
}
