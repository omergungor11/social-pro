import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { SocialAccountController } from "./social-account.controller";
import { SocialAccountService } from "./social-account.service";
import { EncryptionService } from "./services/encryption.service";
import { PlatformRegistryService } from "./services/platform-registry.service";
import { TwitterConnector } from "./connectors/twitter.connector";
import { FacebookConnector } from "./connectors/facebook.connector";
import { InstagramConnector } from "./connectors/instagram.connector";
import { LinkedinConnector } from "./connectors/linkedin.connector";
import { TiktokConnector } from "./connectors/tiktok.connector";
import { YoutubeConnector } from "./connectors/youtube.connector";
import { TokenRefreshJob } from "./jobs/token-refresh.job";

/**
 * Social Account module.
 *
 * Provides OAuth connectivity for all 6 supported platforms:
 * Twitter, Facebook, Instagram, LinkedIn, TikTok, YouTube.
 *
 * Responsibilities:
 *  - OAuth authorization URL generation
 *  - Authorization code exchange & token storage (encrypted)
 *  - Token refresh (manual + scheduled via SocialAccountQueueModule)
 *  - Account health checks
 *  - Secure disconnect (token revocation + DB deletion)
 *
 * To enable background token refresh, also import SocialAccountQueueModule
 * in AppModule alongside this module.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SocialAccountController],
  providers: [
    // Core services
    SocialAccountService,
    EncryptionService,
    PlatformRegistryService,

    // Platform connectors
    TwitterConnector,
    FacebookConnector,
    InstagramConnector,
    LinkedinConnector,
    TiktokConnector,
    YoutubeConnector,

    // Job handler (stateless; queue registration lives in SocialAccountQueueModule)
    TokenRefreshJob,
  ],
  exports: [SocialAccountService],
})
export class SocialAccountModule {}
