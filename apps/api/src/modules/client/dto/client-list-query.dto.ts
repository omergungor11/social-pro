import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export enum ClientSortBy {
  NAME = "name",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  COMPANY = "company",
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export class ClientListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Free-text search against name, email, and company fields",
    example: "acme",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter clients that contain ALL of the provided tags",
    example: ["vip", "e-commerce"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? [value] : value
  )
  tags?: string[];

  @ApiPropertyOptional({
    description: "Filter clients that belong to the given group id",
    example: "clx1abc000000",
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    description: "Field to sort by",
    enum: ClientSortBy,
    default: ClientSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ClientSortBy)
  sortBy?: ClientSortBy = ClientSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
