import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

export class GroupMembersDto {
  @ApiProperty({
    description: "List of client IDs to add or remove from the group (max 500)",
    example: ["clx1abc000001", "clx1abc000002"],
    type: [String],
    maxItems: 500,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  clientIds!: string[];
}
