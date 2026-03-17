import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { UserRole } from "@social-pro/shared-types";

export class ChangeRoleDto {
  @ApiProperty({
    description: "New role to assign to the member",
    enum: UserRole,
    example: UserRole.EDITOR,
  })
  @IsEnum(UserRole, { message: "role must be a valid UserRole" })
  role!: UserRole;
}
