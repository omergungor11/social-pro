import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { SocialPlatform } from "@social-pro/prisma";

export class ListAccountsQueryDto {
  @ApiPropertyOptional({
    enum: SocialPlatform,
    description: "Filter by social platform",
  })
  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @ApiPropertyOptional({
    description: "Filter accounts belonging to a specific client",
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: "Filter by active status",
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  isActive?: boolean;
}
