import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../common/prisma/prisma.module";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";
import { MediaModule } from "../media/media.module";
import { NotificationModule } from "../notification/notification.module";
import { SocialAccountModule } from "../social-account/social-account.module";
import { EncryptionService } from "../social-account/services/encryption.service";
import { PostController } from "./post.controller";
import { QueueController } from "./queue.controller";
import { PostService } from "./post.service";
import { PostApprovalService } from "./post-approval.service";
import { QueueSlotService } from "./queue-slot.service";
import { PostSchedulerService, POST_PUBLISH_QUEUE } from "./jobs/post-scheduler.service";
import { PostPublishProcessor } from "./jobs/post-publish.processor";
import { PublisherService } from "./publisher/publisher.service";
import { TwitterPublisher } from "./publisher/adapters/twitter.publisher";
import { FacebookPublisher } from "./publisher/adapters/facebook.publisher";
import { InstagramPublisher } from "./publisher/adapters/instagram.publisher";
import { LinkedInPublisher } from "./publisher/adapters/linkedin.publisher";
import { TikTokPublisher } from "./publisher/adapters/tiktok.publisher";

/**
 * Post module.
 *
 * Responsibilities:
 *  - CRUD for posts (DRAFT → SCHEDULED → PUBLISHING → PUBLISHED / FAILED / CANCELLED)
 *  - Scheduled publishing via BullMQ delayed jobs
 *  - Immediate publish via PublisherService
 *  - Per-platform adapters: Twitter, Facebook, Instagram, LinkedIn
 *  - Media attachment management (links PostMedia to Post)
 *
 * The BullMQ queue is registered here with connection settings read from
 * environment variables (REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_TLS).
 *
 * Requires MediaModule for media upload/deletion helpers.
 * Requires SocialAccountModule (transitively provides EncryptionService).
 */
@Module({
  imports: [
    PrismaModule,
    RateLimitModule,
    MediaModule,
    NotificationModule,
    SocialAccountModule,
    BullModule.forRoot({
      connection: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: parseInt(process.env["REDIS_PORT"] ?? "6379", 10),
        password: process.env["REDIS_PASSWORD"] ?? undefined,
        tls: process.env["REDIS_TLS"] === "true" ? {} : undefined,
      },
    }),
    BullModule.registerQueue({ name: POST_PUBLISH_QUEUE }),
  ],
  controllers: [PostController, QueueController],
  providers: [
    // Core services
    PostService,
    PostApprovalService,
    QueueSlotService,
    PostSchedulerService,

    // BullMQ processor
    PostPublishProcessor,

    // Publisher orchestrator
    PublisherService,

    // Platform adapters
    TwitterPublisher,
    FacebookPublisher,
    InstagramPublisher,
    LinkedInPublisher,
    TikTokPublisher,

    // Encryption (needed by PublisherService to decrypt tokens)
    EncryptionService,
  ],
  exports: [PostService, PostSchedulerService],
})
export class PostModule {}
