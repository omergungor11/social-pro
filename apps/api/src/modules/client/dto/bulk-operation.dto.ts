import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum BulkAction {
  DELETE = "delete",
  ADD_TO_GROUP = "add-to-group",
  REMOVE_FROM_GROUP = "remove-from-group",
  ADD_TAGS = "add-tags",
  REMOVE_TAGS = "remove-tags",
}

export class BulkOperationDataDto {
  @ApiPropertyOptional({
    description: "Target group ID — required for add-to-group and remove-from-group actions",
    example: "clx1abc000001",
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    description: "Tags to add or remove — required for add-tags and remove-tags actions",
    example: ["vip", "priority"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BulkOperationDto {
  @ApiProperty({
    description: "The bulk action to perform on the selected clients",
    enum: BulkAction,
    example: BulkAction.ADD_TO_GROUP,
  })
  @IsEnum(BulkAction)
  action!: BulkAction;

  @ApiProperty({
    description: "IDs of clients to operate on (max 500)",
    example: ["clx1abc000001", "clx1abc000002"],
    type: [String],
    maxItems: 500,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  clientIds!: string[];

  @ApiPropertyOptional({
    description: "Additional data required by certain actions (groupId, tags)",
    type: BulkOperationDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkOperationDataDto)
  data?: BulkOperationDataDto;
}
