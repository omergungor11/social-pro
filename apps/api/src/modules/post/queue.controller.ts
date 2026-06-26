import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PostingSlot } from "@social-pro/prisma";
import { UserRole } from "@social-pro/shared-types";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { QueueSlotService, BulkScheduleResultItem } from "./queue-slot.service";
import { CreatePostingSlotDto, BulkScheduleDto } from "./dto/posting-slot.dto";

@ApiTags("Queue")
@ApiBearerAuth()
@Controller()
@UseGuards(RolesGuard)
export class QueueController {
  constructor(private readonly queueSlotService: QueueSlotService) {}

  @Get("posting-slots")
  @ApiOperation({ summary: "List recurring posting (queue) slots" })
  @ApiResponse({ status: 200, description: "Slots retrieved" })
  async listSlots(@CurrentAgency() agencyId: string): Promise<PostingSlot[]> {
    return this.queueSlotService.listSlots(agencyId);
  }

  @Post("posting-slots")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a recurring posting (queue) slot" })
  @ApiResponse({ status: 201, description: "Slot created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  async createSlot(
    @CurrentAgency() agencyId: string,
    @Body() dto: CreatePostingSlotDto
  ): Promise<PostingSlot> {
    return this.queueSlotService.createSlot(agencyId, dto);
  }

  @Delete("posting-slots/:id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a posting (queue) slot" })
  @ApiParam({ name: "id", description: "PostingSlot id" })
  @ApiResponse({ status: 204, description: "Slot deleted" })
  @ApiResponse({ status: 404, description: "Slot not found" })
  async deleteSlot(
    @CurrentAgency() agencyId: string,
    @Param("id") slotId: string
  ): Promise<void> {
    return this.queueSlotService.deleteSlot(agencyId, slotId);
  }

  @Post("posts/bulk-schedule")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Bulk-schedule draft posts onto the next free queue slots",
    description:
      "Distributes the given DRAFT posts across the next available recurring " +
      "posting slots. Per-post results indicate which were scheduled.",
  })
  @ApiResponse({ status: 200, description: "Bulk schedule results" })
  @ApiResponse({ status: 400, description: "No active posting slots configured" })
  async bulkSchedule(
    @CurrentAgency() agencyId: string,
    @Body() dto: BulkScheduleDto
  ): Promise<BulkScheduleResultItem[]> {
    return this.queueSlotService.bulkSchedule(agencyId, dto.postIds);
  }
}
