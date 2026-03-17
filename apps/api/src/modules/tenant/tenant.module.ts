import { Global, Module } from "@nestjs/common";
import { TenantService } from "./tenant.service";
import { TenantGuard } from "./tenant.guard";
import { TenantMiddleware } from "./tenant.middleware";

@Global()
@Module({
  providers: [TenantService, TenantGuard, TenantMiddleware],
  exports: [TenantService, TenantGuard, TenantMiddleware],
})
export class TenantModule {}
