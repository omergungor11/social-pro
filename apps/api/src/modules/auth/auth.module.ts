import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        // The default secret / expiry used when calling jwtService.signAsync
        // without an explicit secret override.  Individual signAsync calls in
        // AuthService pass their own secret, so these values serve as the
        // safe access-token defaults.
        secret: process.env["JWT_SECRET"] ?? "change-me-in-production",
        signOptions: {
          expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    // Register AuthGuard globally so every route is protected by default.
    // Use @Public() on routes that should skip authentication.
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
