import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ChangePlanDto {
  @ApiProperty({
    description: "ID of the new Plan to switch to",
    example: "cldabc456",
  })
  @IsString()
  @IsNotEmpty()
  newPlanId!: string;
}
