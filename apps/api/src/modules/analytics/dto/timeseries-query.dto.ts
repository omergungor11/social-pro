import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

export type TimeSeriesMetric = "FOLLOWERS" | "IMPRESSIONS" | "ENGAGEMENT";

export const TIME_SERIES_METRICS: TimeSeriesMetric[] = [
  "FOLLOWERS",
  "IMPRESSIONS",
  "ENGAGEMENT",
];

export class TimeSeriesQueryDto {
  @ApiProperty({
    description: "Metric to plot",
    enum: TIME_SERIES_METRICS,
    example: "FOLLOWERS",
  })
  @IsIn(TIME_SERIES_METRICS)
  metric!: TimeSeriesMetric;

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

  @ApiPropertyOptional({
    description: "Filter by a specific client (brand)",
  })
  @IsOptional()
  @IsString()
  clientId?: string;
}
