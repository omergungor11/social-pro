import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

export class UpsertOAuthConfigDto {
  @ApiProperty({
    description: "OAuth client ID for the platform application",
    example: "my-client-id-1234",
  })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({
    description: "OAuth client secret for the platform application",
    example: "my-client-secret-abcd",
  })
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;

  @ApiPropertyOptional({
    description:
      "Custom OAuth scopes. When omitted, the connector's default scopes are used.",
    example: ["tweet.read", "tweet.write", "users.read"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description:
      "Override redirect URI. When omitted, the URI is derived from API_URL.",
    example: "https://api.example.com/api/v1/social-accounts/oauth/twitter/callback",
  })
  @IsOptional()
  @IsUrl()
  redirectUri?: string;

  @ApiPropertyOptional({
    description: "Whether this config is active. Defaults to true.",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
