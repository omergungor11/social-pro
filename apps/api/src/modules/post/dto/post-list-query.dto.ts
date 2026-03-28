import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { PostStatus, SocialPlatform } from "@social-pro/prisma";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class PostListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PostStatus,
    description: "Filter by post status",
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    enum: SocialPlatform,
    description: "Filter posts that have at least one target on the given platform",
  })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @ApiPropertyOptional({ description: "Filter by client ID" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: "Filter by social account ID (target)" })
  @IsOptional()
  @IsString()
  socialAccountId?: string;

  @ApiPropertyOptional({
    description: "Start of date range filter (ISO-8601, inclusive)",
    example: "2025-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End of date range filter (ISO-8601, inclusive)",
    example: "2025-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
