import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "Display name",
    example: "Jane Doe",
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "name cannot be empty" })
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: "Public URL of the user avatar. Pass an empty string to clear.",
    example: "https://example.com/avatar.jpg",
  })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: "avatarUrl must be a valid URL" })
  avatarUrl?: string;
}
