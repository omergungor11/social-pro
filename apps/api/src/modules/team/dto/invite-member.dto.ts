import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum } from "class-validator";
import { UserRole } from "@social-pro/shared-types";

export class InviteMemberDto {
  @ApiProperty({
    description: "Email address of the person to invite",
    example: "member@example.com",
  })
  @IsEmail({}, { message: "email must be a valid email address" })
  email!: string;

  @ApiProperty({
    description: "Role to assign to the invited member",
    enum: UserRole,
    example: UserRole.EDITOR,
  })
  @IsEnum(UserRole, { message: "role must be a valid UserRole" })
  role!: UserRole;
}
