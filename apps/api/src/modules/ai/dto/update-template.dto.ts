import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { SocialPlatform } from "@social-pro/prisma";

export class UpdateTemplateDto {
  @ApiPropertyOptional({
    description: "Human-readable template name",
    example: "Updated Product Launch",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: "Target social platform",
    enum: SocialPlatform,
  })
  @IsOptional()
  @IsString()
  platform?: SocialPlatform;

  @ApiPropertyOptional({
    description: "Template body as a JSON object",
  })
  @IsOptional()
  @IsObject()
  template?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "List of variable names used inside the template",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
