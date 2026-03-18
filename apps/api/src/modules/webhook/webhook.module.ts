// NOTE: Add to app.module.ts: import { WebhookModule } from "./modules/webhook/webhook.module";
// and add WebhookModule to the imports array.
import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { WebhookController } from "./webhook.controller";
import { WebhookVerificationService } from "./services/webhook-verification.service";
import { TwitterWebhookHandler } from "./handlers/twitter-webhook.handler";
import { FacebookWebhookHandler } from "./handlers/facebook-webhook.handler";
import { LinkedInWebhookHandler } from "./handlers/linkedin-webhook.handler";
import { TikTokWebhookHandler } from "./handlers/tiktok-webhook.handler";
import { YouTubeWebhookHandler } from "./handlers/youtube-webhook.handler";

/**
 * WebhookModule
 *
 * Handles inbound webhooks from all supported social media platforms:
 *  - Twitter  (Account Activity API)
 *  - Facebook / Instagram  (Graph API Webhooks)
 *  - LinkedIn  (Events API)
 *  - TikTok    (Events API)
 *  - YouTube   (PubSubHubbub / WebSub)
 *
 * Authentication is performed via per-platform HMAC signature verification
 * inside WebhookVerificationService. All routes are @Public() — no JWT guard.
 *
 * Required environment variables:
 *  - TWITTER_WEBHOOK_SECRET
 *  - FACEBOOK_WEBHOOK_SECRET
 *  - FACEBOOK_VERIFY_TOKEN
 *  - LINKEDIN_WEBHOOK_SECRET
 *  - TIKTOK_WEBHOOK_SECRET
 *  - YOUTUBE_WEBHOOK_SECRET
 *
 * The RawWebhookEvent Prisma model must exist in the schema. Run:
 *   npx prisma migrate dev --name add_raw_webhook_event
 * after adding the model to schema.prisma.
 */
@Module({
  imports: [PrismaModule],
  controllers: [WebhookController],
  providers: [
    WebhookVerificationService,
    TwitterWebhookHandler,
    FacebookWebhookHandler,
    LinkedInWebhookHandler,
    TikTokWebhookHandler,
    YouTubeWebhookHandler,
  ],
})
export class WebhookModule {}
