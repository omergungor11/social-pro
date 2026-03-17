import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateGroupDto {
  @ApiProperty({
    description: "Display name for the client group",
    example: "VIP Clients",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: "Hex colour used when displaying the group label (e.g. #6366f1)",
    example: "#6366f1",
    default: "#6366f1",
  })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: "Optional description of the group",
    example: "High-value clients that receive priority support",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
