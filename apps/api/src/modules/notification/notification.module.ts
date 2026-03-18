import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../common/prisma/prisma.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationGateway } from "./notification.gateway";
import {
  EmailService,
  EmailProcessor,
  EmailTemplatesService,
  EMAIL_NOTIFICATION_QUEUE,
} from "./email";

/**
 * Notification module.
 *
 * Provides:
 *  - NotificationService: create, list, mark-as-read, preferences management
 *  - NotificationGateway: WebSocket gateway (socket.io namespace /notifications)
 *    for real-time delivery of notification:new, post:status-changed,
 *    and account:status-changed events
 *  - EmailService + EmailProcessor: async email delivery via BullMQ
 *  - EmailTemplatesService: email template rendering
 *
 * WebSocket authentication is handled manually inside NotificationGateway
 * by verifying the JWT from the socket handshake auth token / query param.
 *
 * Environment variables:
 *  - JWT_SECRET          — used to verify WebSocket connections
 *  - CORS_ORIGIN         — allowed WebSocket origin (default: http://localhost:3000)
 *  - REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_TLS — BullMQ connection
 *  - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM — email delivery
 */
@Module({
  imports: [
    PrismaModule,

    // JwtModule needed by NotificationGateway for manual WS token verification
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env["JWT_SECRET"] ?? "change-me-in-production",
        signOptions: {
          expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m",
        },
      }),
    }),

    // BullMQ queue for email notifications
    BullModule.forRoot({
      connection: {
        host: process.env["REDIS_HOST"] ?? "localhost",
        port: parseInt(process.env["REDIS_PORT"] ?? "6379", 10),
        password: process.env["REDIS_PASSWORD"] ?? undefined,
        tls: process.env["REDIS_TLS"] === "true" ? {} : undefined,
      },
    }),
    BullModule.registerQueue({ name: EMAIL_NOTIFICATION_QUEUE }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    EmailService,
    EmailProcessor,
    EmailTemplatesService,
  ],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}
