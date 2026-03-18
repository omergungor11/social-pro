import { Injectable, Logger } from "@nestjs/common";
import { AuditLog, Prisma } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaginatedResponseDto } from "../common/dto/pagination.dto";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogParams {
  agencyId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Log an audit event
  // ---------------------------------------------------------------------------

  async log(params: AuditLogParams): Promise<AuditLog> {
    const entry = await this.prisma.auditLog.create({
      data: {
        agencyId: params.agencyId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        changes: params.changes
          ? (params.changes as Prisma.InputJsonValue)
          : undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });

    this.logger.debug(
      `AuditLog: agencyId=${params.agencyId} userId=${params.userId ?? "system"} ` +
        `action=${params.action} entityType=${params.entityType} entityId=${params.entityId ?? "-"}`
    );

    return entry;
  }

  // ---------------------------------------------------------------------------
  // List audit logs (paginated + filtered)
  // ---------------------------------------------------------------------------

  async list(
    agencyId: string,
    query: AuditLogQueryDto
  ): Promise<PaginatedResponseDto<AuditLog>> {
    const { page, limit, entityType, userId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      agencyId,
      ...(entityType ? { entityType } : {}),
      ...(userId ? { userId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return PaginatedResponseDto.of(logs, total, page, limit);
  }
}
