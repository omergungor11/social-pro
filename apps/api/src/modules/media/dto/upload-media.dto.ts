import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UploadMediaDto {
  @ApiPropertyOptional({
    description: "Alternative text for the uploaded media (images)",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string;
}
