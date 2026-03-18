import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

/**
 * Audit module.
 *
 * Provides:
 *  - AuditService: log() for writing audit entries, list() for paginated retrieval
 *  - AuditController: GET /audit-log (ADMIN/OWNER only)
 *
 * AuditService is exported so other modules (e.g. billing, social-account)
 * can inject it and call log() to record sensitive operations.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
