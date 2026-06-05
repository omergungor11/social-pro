import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ReplyDto {
  @ApiProperty({ description: "Reply body to post to the platform" })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  text!: string;
}
