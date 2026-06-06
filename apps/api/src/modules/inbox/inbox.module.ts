import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { EncryptionService } from "../social-account/services/encryption.service";
import { InboxController } from "./inbox.controller";
import { InboxService } from "./inbox.service";
import { FacebookInboxAdapter } from "./adapters/facebook.inbox";
import { InstagramInboxAdapter } from "./adapters/instagram.inbox";
import { TwitterInboxAdapter } from "./adapters/twitter.inbox";
import { LinkedInInboxAdapter } from "./adapters/linkedin.inbox";
import { TikTokInboxAdapter } from "./adapters/tiktok.inbox";

/**
 * Unified social inbox — fetches comments, mentions and direct messages from
 * connected platforms, persists them, and dispatches replies back.
 */
@Module({
  imports: [PrismaModule],
  controllers: [InboxController],
  providers: [
    InboxService,
    EncryptionService,
    FacebookInboxAdapter,
    InstagramInboxAdapter,
    TwitterInboxAdapter,
    LinkedInInboxAdapter,
    TikTokInboxAdapter,
  ],
  exports: [InboxService],
})
export class InboxModule {}
