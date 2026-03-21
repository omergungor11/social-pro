import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const VALID_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3"] as const;

export class GenerateImageDto {
  @ApiProperty({
    description: "Text prompt describing the image to generate",
    example: "A vibrant flat-lay of summer fashion accessories on a white background",
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt!: string;

  @ApiPropertyOptional({
    description: "Desired aspect ratio for the image",
    enum: VALID_ASPECT_RATIOS,
    example: "1:1",
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_ASPECT_RATIOS, {
    message: `aspectRatio must be one of: ${VALID_ASPECT_RATIOS.join(", ")}`,
  })
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3";

  @ApiPropertyOptional({
    description: "Visual style for the generated image",
    example: "photorealistic",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  style?: string;

  @ApiPropertyOptional({
    description: "Target social media platform for composition guidance",
    example: "INSTAGRAM",
  })
  @IsOptional()
  @IsString()
  platform?: string;
}
