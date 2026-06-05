import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class AssignClientDto {
  @ApiPropertyOptional({
    description:
      "Client (brand) ID to assign the account to. Pass null to unassign.",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  clientId!: string | null;
}
