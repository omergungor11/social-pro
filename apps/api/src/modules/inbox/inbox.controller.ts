import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { InboxDeleteResult } from "@social-pro/shared-types";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { InboxService, InboxItemDto } from "./inbox.service";
import { ListInboxQueryDto } from "./dto/list-inbox-query.dto";
import { ReplyDto } from "./dto/reply.dto";
import { MarkStatusDto } from "./dto/mark-status.dto";

@ApiTags("inbox")
@Controller("inbox")
@UseGuards(RolesGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  @ApiOperation({ summary: "List inbox items (comments, mentions, DMs)" })
  async list(
    @CurrentAgency() agencyId: string,
    @Query() query: ListInboxQueryDto,
  ): Promise<{ data: InboxItemDto[]; meta: unknown }> {
    return this.inboxService.list(agencyId, query);
  }

  @Get("stats")
  @ApiOperation({ summary: "Inbox counts by platform and type" })
  async stats(
    @CurrentAgency() agencyId: string,
    @Query("clientId") clientId?: string,
  ): Promise<unknown> {
    return this.inboxService.getStats(agencyId, clientId);
  }

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Pull new interactions from connected platforms" })
  async sync(
    @CurrentAgency() agencyId: string,
    @Query("accountId") accountId?: string,
    @Query("clientId") clientId?: string,
  ): Promise<{ synced: number; message: string }> {
    return this.inboxService.sync(agencyId, accountId, clientId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single item with its threaded replies" })
  @ApiParam({ name: "id" })
  async getThread(
    @CurrentAgency() agencyId: string,
    @Param("id") id: string,
  ): Promise<InboxItemDto> {
    return this.inboxService.getThread(agencyId, id);
  }

  @Post(":id/reply")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Reply to an interaction on its platform" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 400, description: "Replying not supported for this platform" })
  async reply(
    @CurrentAgency() agencyId: string,
    @Param("id") id: string,
    @Body() body: ReplyDto,
  ): Promise<InboxItemDto> {
    return this.inboxService.reply(agencyId, id, body.text);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an interaction from the platform and inbox" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 200, description: "Item deleted (platform delete is best-effort)" })
  async remove(
    @CurrentAgency() agencyId: string,
    @Param("id") id: string,
  ): Promise<InboxDeleteResult> {
    return this.inboxService.deleteItem(agencyId, id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Mark an item read / unread / archived" })
  @ApiParam({ name: "id" })
  async markStatus(
    @CurrentAgency() agencyId: string,
    @Param("id") id: string,
    @Body() body: MarkStatusDto,
  ): Promise<InboxItemDto> {
    return this.inboxService.markStatus(agencyId, id, body.status);
  }
}
