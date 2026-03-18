import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { NotificationChannel, NotificationType } from "@social-pro/prisma";

export class NotificationPreferenceItemDto {
  @ApiProperty({
    enum: NotificationChannel,
    description: "Notification delivery channel",
  })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty({
    enum: NotificationType,
    description: "Notification type",
  })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({
    description: "Whether this notification channel+type combination is enabled",
  })
  @IsBoolean()
  enabled!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({
    type: [NotificationPreferenceItemDto],
    description: "Array of preference updates",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences!: NotificationPreferenceItemDto[];
}
