import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PublisherService } from "../publisher/publisher.service";
import {
  POST_PUBLISH_QUEUE,
  PostPublishJobData,
} from "./post-scheduler.service";

/**
 * BullMQ worker that processes scheduled post publish jobs.
 *
 * This processor is registered in PostQueueModule and wired to the
 * `post-publish` queue. When a delayed job fires, it loads the post,
 * verifies it is still SCHEDULED, and delegates to PublisherService.
 *
 * Idempotency: If the post has already been PUBLISHED or CANCELLED, the
 * job exits silently without error — the status check acts as a guard.
 */
@Processor(POST_PUBLISH_QUEUE)
export class PostPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PostPublishProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: PublisherService
  ) {
    super();
  }

  async process(job: Job<PostPublishJobData>): Promise<void> {
    const { postId, agencyId } = job.data;

    this.logger.log(`Processing publish job: postId=${postId} agencyId=${agencyId}`);

    const post = await this.prisma.post.findFirst({
      where: { id: postId, agencyId },
      include: {
        media: true,
        targets: { include: { socialAccount: true } },
        approvals: true,
      },
    });

    if (!post) {
      this.logger.warn(
        `Skipping publish job — post not found: postId=${postId} agencyId=${agencyId}`
      );
      return;
    }

    if (post.status !== "SCHEDULED") {
      this.logger.log(
        `Skipping publish job — post is no longer SCHEDULED: postId=${postId} status=${post.status}`
      );
      return;
    }

    // Mark as PUBLISHING before handing off
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHING" },
    });

    const results = await this.publisher.publish(post);

    const failCount = results.filter((r) => !r.success).length;
    if (failCount > 0) {
      this.logger.warn(
        `Publish completed with failures: postId=${postId} failed=${failCount}/${results.length}`
      );
    } else {
      this.logger.log(
        `Publish completed successfully: postId=${postId} targets=${results.length}`
      );
    }
  }
}
