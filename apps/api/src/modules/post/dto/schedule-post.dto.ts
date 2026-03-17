import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty } from "class-validator";

export class SchedulePostDto {
  @ApiProperty({
    description: "ISO-8601 datetime at which the post should be published",
    example: "2025-06-15T10:00:00Z",
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledAt!: string;
}
