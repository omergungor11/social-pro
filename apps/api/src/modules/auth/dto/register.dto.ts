import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "jane@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "supersecret123", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: "Jane Doe", minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "Acme Agency", minLength: 2 })
  @IsString()
  @MinLength(2)
  agencyName!: string;
}
