import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PostTargetInputDto } from "./create-post.dto";

export class UpdatePostDto {
  @ApiPropertyOptional({ description: "Updated post title" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: "Updated post content as a JSON object",
    example: { text: "Updated copy #launch" },
  })
  @IsOptional()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Updated client ID" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description:
      "Replaces the full list of targets. " +
      "Omit to leave targets unchanged.",
    type: [PostTargetInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostTargetInputDto)
  targets?: PostTargetInputDto[];

  @ApiPropertyOptional({ description: "Update AI-generated flag" })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @ApiPropertyOptional({ description: "Updated AI prompt" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aiPrompt?: string;
}
