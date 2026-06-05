import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { InboxItemStatus } from "@social-pro/prisma";

export class MarkStatusDto {
  @ApiProperty({ enum: InboxItemStatus })
  @IsEnum(InboxItemStatus)
  status!: InboxItemStatus;
}
