import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaModule } from "./modules/common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { TenantMiddleware } from "./modules/tenant/tenant.middleware";

@Module({
  imports: [PrismaModule, AuthModule, TenantModule],
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
