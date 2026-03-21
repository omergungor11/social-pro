import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { RateLimitService } from "./rate-limit.service";
import { PlatformRateLimitService } from "./platform-rate-limit.service";
import { RateLimitGuard } from "./rate-limit.guard";

@Module({
  providers: [
    RateLimitService,
    PlatformRateLimitService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [RateLimitService, PlatformRateLimitService],
})
export class RateLimitModule {}
