import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { InboxItemStatus, InboxItemType, SocialPlatform } from "@social-pro/prisma";

export class ListInboxQueryDto {
  @ApiPropertyOptional({ enum: InboxItemStatus })
  @IsOptional()
  @IsEnum(InboxItemStatus)
  status?: InboxItemStatus;

  @ApiPropertyOptional({ enum: InboxItemType })
  @IsOptional()
  @IsEnum(InboxItemType)
  type?: InboxItemType;

  @ApiPropertyOptional({ enum: SocialPlatform })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @ApiPropertyOptional({ description: "Filter by a specific connected account" })
  @IsOptional()
  @IsString()
  socialAccountId?: string;

  @ApiPropertyOptional({ description: "Filter by a specific client (brand)" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value != null ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value != null ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
