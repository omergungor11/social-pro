import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class PresignedUrlRequestDto {
  @ApiProperty({
    description: "Original filename including extension",
    example: "photo.jpg",
  })
  @IsNotEmpty()
  @IsString()
  filename!: string;

  @ApiProperty({
    description: "MIME type of the file to upload",
    example: "image/jpeg",
  })
  @IsNotEmpty()
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    description: "Presigned URL expiry in seconds (default 3600, max 86400)",
    default: 3600,
    minimum: 60,
    maximum: 86400,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  expiresIn?: number = 3600;
}

export class PresignedUrlResponseDto {
  @ApiProperty({ description: "Presigned PUT URL for direct S3 upload" })
  uploadUrl!: string;

  @ApiProperty({ description: "Storage key — pass this back when creating PostMedia" })
  storageKey!: string;

  @ApiProperty({ description: "Public URL the asset will be available at after upload" })
  publicUrl!: string;

  @ApiProperty({ description: "Expiry timestamp in ISO-8601" })
  expiresAt!: string;
}
