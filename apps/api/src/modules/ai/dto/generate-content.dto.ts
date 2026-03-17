import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class GenerateContentDto {
  @ApiProperty({
    description: "The prompt describing what content to generate",
    example: "Write an engaging Instagram post about our summer sale with 20% off all products",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  prompt!: string;

  @ApiPropertyOptional({
    description: "Target social platform for content optimisation",
    example: "INSTAGRAM",
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: "Desired tone for the generated content",
    example: "professional",
  })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({
    description: "Language for the generated content (e.g. 'English', 'Spanish')",
    example: "English",
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: "ID of a ContentTemplate to use as a generation base",
    example: "cldxyz123",
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}
