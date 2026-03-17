import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { MediaType } from "@social-pro/prisma";

export class PostMediaInputDto {
  @ApiProperty({ description: "Public URL or S3 storage key of the media asset" })
  @IsNotEmpty()
  @IsString()
  url!: string;

  @ApiProperty({ enum: MediaType, description: "Type of media" })
  @IsEnum(MediaType)
  mediaType!: MediaType;

  @ApiPropertyOptional({ description: "S3 storage key (when uploaded via presigned URL)" })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ description: "Thumbnail URL for videos" })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: "File size in bytes" })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: "MIME type of the file" })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: "Alternative text for accessibility" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;

  @ApiPropertyOptional({ description: "Display order (0-based)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;
}

export class PostTargetInputDto {
  @ApiProperty({ description: "Social account ID to publish to" })
  @IsNotEmpty()
  @IsString()
  socialAccountId!: string;

  @ApiPropertyOptional({
    description: "Platform-specific content overrides (e.g. hashtags, alt-text per platform)",
    type: "object",
  })
  @IsOptional()
  platformSpecificContent?: Record<string, unknown>;
}

export class CreatePostDto {
  @ApiPropertyOptional({ description: "Human-readable post title (internal label)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: "Post content as a JSON object. " +
      "At minimum include a `text` field. " +
      "Platform adapters read additional keys (e.g. `hashtags`, `link`).",
    example: { text: "Hello world! #launch" },
  })
  @IsNotEmpty()
  content!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Client ID this post belongs to" })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: "Target social accounts",
    type: [PostTargetInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostTargetInputDto)
  targets?: PostTargetInputDto[];

  @ApiPropertyOptional({
    description: "Media attachments",
    type: [PostMediaInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMediaInputDto)
  media?: PostMediaInputDto[];

  @ApiPropertyOptional({ description: "True when this post was AI-generated" })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean = false;

  @ApiPropertyOptional({ description: "The AI prompt used to generate this content" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  aiPrompt?: string;
}
