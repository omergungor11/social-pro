import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { SocialPlatform } from "@social-pro/prisma";

export class ConnectAccountDto {
  @ApiProperty({
    enum: SocialPlatform,
    description: "The social platform to connect",
    example: SocialPlatform.TWITTER,
  })
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;
}
