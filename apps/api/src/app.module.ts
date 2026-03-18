import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./modules/common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { TenantMiddleware } from "./modules/tenant/tenant.middleware";
import { TeamModule } from "./modules/team/team.module";
import { ClientModule } from "./modules/client/client.module";
import { SocialAccountModule } from "./modules/social-account/social-account.module";
import { MediaModule } from "./modules/media/media.module";
import { PostModule } from "./modules/post/post.module";
import { AiModule } from "./modules/ai/ai.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { BillingModule } from "./modules/billing/billing.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { AuditModule } from "./modules/audit/audit.module";
import { WebhookModule } from "./modules/webhook/webhook.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantModule,
    TeamModule,
    ClientModule,
    SocialAccountModule,
    MediaModule,
    PostModule,
    AiModule,
    AnalyticsModule,
    BillingModule,
    NotificationModule,
    AuditModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
