import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { ReportType } from "@social-pro/prisma";

/**
 * Report creation payload.
 *
 * The frontend sends `type`, `startDate`, `endDate`, and `platforms`, while the
 * original API contract used `reportType`, `dateRangeStart`, and `dateRangeEnd`.
 * Both naming conventions are accepted; the resolver getters below normalise
 * them so the service can read canonical values regardless of which the caller
 * supplied.
 */
export class CreateReportDto {
  @ApiProperty({
    description: "Report title",
    example: "Q1 2026 Performance Report",
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: "Report type (frontend field name)",
    enum: ReportType,
    example: ReportType.MONTHLY,
  })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({
    description: "Report type (legacy field name)",
    enum: ReportType,
    example: ReportType.MONTHLY,
  })
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @ApiPropertyOptional({
    description: "Start of the reporting period (frontend field name)",
    example: "2026-01-01",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End of the reporting period (frontend field name)",
    example: "2026-03-31",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: "Start of the reporting period (legacy field name)",
    example: "2026-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  dateRangeStart?: string;

  @ApiPropertyOptional({
    description: "End of the reporting period (legacy field name)",
    example: "2026-03-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  dateRangeEnd?: string;

  @ApiPropertyOptional({
    description: "Platforms to scope the report to",
    example: ["TWITTER", "INSTAGRAM"],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @ApiPropertyOptional({
    description: "Scope the report to a specific client",
    example: "cldxyz123",
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  // --- Resolved canonical values -----------------------------------------

  get resolvedReportType(): ReportType {
    return this.type ?? this.reportType ?? ReportType.CUSTOM;
  }

  get resolvedStartDate(): string | undefined {
    return this.startDate ?? this.dateRangeStart;
  }

  get resolvedEndDate(): string | undefined {
    return this.endDate ?? this.dateRangeEnd;
  }
}
