import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreatePostingSlotDto {
  @ApiProperty({ description: "Day of week (0 = Sunday … 6 = Saturday)", example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ description: "Hour of day (0–23), in the agency timezone", example: 9 })
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @ApiPropertyOptional({ description: "Minute (0–59)", example: 30, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;

  @ApiPropertyOptional({
    description: "Restrict this slot to a single social account (optional)",
  })
  @IsOptional()
  @IsString()
  socialAccountId?: string;
}

export class BulkScheduleDto {
  @ApiProperty({
    description: "IDs of DRAFT posts to distribute across the next free queue slots",
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  postIds!: string[];
}
