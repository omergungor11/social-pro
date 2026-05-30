import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber } from "class-validator";

export class SelectFacebookPageDto {
  @ApiProperty({ description: "Facebook Page ID" })
  @IsString()
  pageId!: string;

  @ApiProperty({ description: "Facebook Page name" })
  @IsString()
  pageName!: string;

  @ApiPropertyOptional({ description: "Page profile picture URL" })
  @IsOptional()
  @IsString()
  pictureUrl?: string;

  @ApiPropertyOptional({ description: "Page followers count" })
  @IsOptional()
  @IsNumber()
  followersCount?: number;

  @ApiPropertyOptional({ description: "Page category" })
  @IsOptional()
  @IsString()
  category?: string;
}
