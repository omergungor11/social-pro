import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { ReportType } from "@social-pro/prisma";

export class CreateReportDto {
  @ApiProperty({
    description: "Report title",
    example: "Q1 2026 Performance Report",
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: "Report type",
    enum: ReportType,
    example: ReportType.MONTHLY,
  })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiProperty({
    description: "Start of the reporting period (ISO-8601)",
    example: "2026-01-01T00:00:00Z",
  })
  @IsDateString()
  dateRangeStart!: string;

  @ApiProperty({
    description: "End of the reporting period (ISO-8601)",
    example: "2026-03-31T23:59:59Z",
  })
  @IsDateString()
  dateRangeEnd!: string;

  @ApiPropertyOptional({
    description: "Scope the report to a specific client",
    example: "cldxyz123",
  })
  @IsOptional()
  @IsString()
  clientId?: string;
}
