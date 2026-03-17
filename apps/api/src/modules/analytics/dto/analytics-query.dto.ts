import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: "Range start (ISO-8601)",
    example: "2026-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "Range end (ISO-8601)",
    example: "2026-03-18T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
