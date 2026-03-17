import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { SocialPlatform } from "@social-pro/prisma";

export class CreateTemplateDto {
  @ApiProperty({
    description: "Human-readable template name",
    example: "Product Launch",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: "Target social platform (omit for platform-agnostic templates)",
    enum: SocialPlatform,
    example: SocialPlatform.INSTAGRAM,
  })
  @IsOptional()
  @IsString()
  platform?: SocialPlatform;

  @ApiProperty({
    description: "Template body as a JSON object containing content fields",
    example: { body: "Introducing {{productName}}! {{description}} Shop now: {{url}}" },
  })
  @IsObject()
  template!: Record<string, unknown>;

  @ApiProperty({
    description: "List of variable names used inside the template (mustache-style {{name}})",
    example: ["productName", "description", "url"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  variables!: string[];
}
