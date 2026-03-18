import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by entity type (e.g. Post, Client, SocialAccount)",
    example: "Post",
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: "Filter by the user who performed the action",
    example: "clxxx...",
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: "Start of date range (ISO 8601)",
    example: "2026-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  @Type(() => String)
  startDate?: string;

  @ApiPropertyOptional({
    description: "End of date range (ISO 8601)",
    example: "2026-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  @Type(() => String)
  endDate?: string;
}
