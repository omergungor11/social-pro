import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateAgencyDto {
  @ApiPropertyOptional({
    description: "Agency display name",
    example: "Acme Media Group",
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "name cannot be empty" })
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({
    description: "URL slug (lowercase letters, numbers and hyphens)",
    example: "acme-media-group",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug can only contain lowercase letters, numbers, and hyphens",
  })
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({
    description: "Default IANA timezone used for scheduling and analytics",
    example: "Europe/Istanbul",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
