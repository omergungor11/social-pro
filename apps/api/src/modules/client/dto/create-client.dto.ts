import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateClientDto {
  @ApiProperty({
    description: "Full name of the client",
    example: "Acme Corporation",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: "Primary contact email address",
    example: "contact@acme.com",
  })
  @IsOptional()
  @IsEmail({}, { message: "email must be a valid email address" })
  email?: string;

  @ApiPropertyOptional({
    description: "Primary contact phone number",
    example: "+1-555-000-1234",
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: "Company or organisation name",
    example: "Acme Corp Ltd.",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @ApiPropertyOptional({
    description: "Internal notes about the client",
    example: "Prefers communication via email",
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: "Arbitrary string tags for categorisation and filtering",
    example: ["vip", "e-commerce"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
