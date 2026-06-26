import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApprovalDecisionDto {
  @ApiPropertyOptional({
    description:
      "Optional note for an approval; required (non-empty) when rejecting a post.",
    example: "Looks good — approved for the Friday slot.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
