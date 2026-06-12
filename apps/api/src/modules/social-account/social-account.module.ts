import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { InboxModule } from "../inbox/inbox.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { SocialAccountController } from "./social-account.controller";
import { OAuthConfigController } from "./oauth-config.controller";
import { SocialAccountService } from "./social-account.service";
import { EncryptionService } from "./services/encryption.service";
import { OAuthConfigService } from "./services/oauth-config.service";
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
 *  - Centralized OAuth credential management (DB-first with env fallback)
 *
 * To enable background token refresh, also import SocialAccountQueueModule
 * in AppModule alongside this module.
 */
@Module({
  imports: [PrismaModule, InboxModule, AnalyticsModule],
  controllers: [SocialAccountController, OAuthConfigController],
  providers: [
    // Core services
    SocialAccountService,
    EncryptionService,
    OAuthConfigService,
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
  exports: [SocialAccountService, OAuthConfigService],
})
export class SocialAccountModule {}
