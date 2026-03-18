import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class NotificationListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Return only unread notifications",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  unreadOnly?: boolean;
}
