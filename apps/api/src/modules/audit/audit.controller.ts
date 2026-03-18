import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@social-pro/shared-types";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { AuditService } from "./audit.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit-log")
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ---------------------------------------------------------------------------
  // List audit logs
  // ---------------------------------------------------------------------------

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: "List audit logs",
    description:
      "Returns paginated audit log entries for the current agency. " +
      "Restricted to ADMIN and OWNER roles. Supports filtering by entityType, " +
      "userId, and date range.",
  })
  @ApiResponse({ status: 200, description: "Audit logs retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Insufficient role" })
  async list(
    @CurrentAgency() agencyId: string,
    @Query() query: AuditLogQueryDto
  ) {
    return this.auditService.list(agencyId, query);
  }
}
