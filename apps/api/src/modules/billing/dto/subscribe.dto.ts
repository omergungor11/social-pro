import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class SubscribeDto {
  @ApiProperty({
    description: "ID of the Plan to subscribe to",
    example: "cldxyz123",
  })
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @ApiPropertyOptional({
    description: "URL to redirect to after a successful checkout",
    example: "https://app.socialpro.io/billing?success=true",
  })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({
    description: "URL to redirect to if the user cancels checkout",
    example: "https://app.socialpro.io/billing?cancelled=true",
  })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}
