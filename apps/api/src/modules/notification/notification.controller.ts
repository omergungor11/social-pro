import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { NotificationService } from "./notification.service";
import { NotificationListQueryDto } from "./dto/notification-list-query.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import type { AuthenticatedUser } from "../common/decorators/current-user.decorator";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ---------------------------------------------------------------------------
  // List notifications
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: "List notifications",
    description:
      "Returns paginated notifications for the current user. " +
      "Unread notifications appear first, then sorted by createdAt descending.",
  })
  @ApiResponse({ status: 200, description: "Notifications retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAgency() agencyId: string,
    @Query() query: NotificationListQueryDto
  ) {
    return this.notificationService.list(user.id, agencyId, query);
  }

  // ---------------------------------------------------------------------------
  // Unread count
  // ---------------------------------------------------------------------------

  @Get("unread-count")
  @ApiOperation({
    summary: "Get unread notification count",
    description: "Returns the number of unread notifications for the current user.",
  })
  @ApiResponse({ status: 200, description: "Unread count returned" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async unreadCount(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAgency() agencyId: string
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(user.id, agencyId);
    return { count };
  }

  // ---------------------------------------------------------------------------
  // Mark one as read
  // ---------------------------------------------------------------------------

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark a notification as read",
    description: "Sets readAt to the current timestamp for the specified notification.",
  })
  @ApiParam({ name: "id", description: "Notification ID" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  // ---------------------------------------------------------------------------
  // Mark all as read
  // ---------------------------------------------------------------------------

  @Post("mark-all-read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark all notifications as read",
    description: "Sets readAt to now for all unread notifications belonging to the current user.",
  })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAgency() agencyId: string
  ): Promise<{ count: number }> {
    return this.notificationService.markAllAsRead(user.id, agencyId);
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  @Get("preferences")
  @ApiOperation({
    summary: "Get notification preferences",
    description:
      "Returns all notification preferences for the current user. " +
      "If no preferences exist yet, defaults are created (all enabled).",
  })
  @ApiResponse({ status: 200, description: "Preferences retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAgency() agencyId: string
  ) {
    return this.notificationService.getPreferences(user.id, agencyId);
  }

  @Patch("preferences")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update notification preferences",
    description:
      "Upserts one or more notification preference records for the current user. " +
      "Each item specifies a channel + type combination and whether it is enabled.",
  })
  @ApiResponse({ status: 200, description: "Preferences updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentAgency() agencyId: string,
    @Body() dto: UpdatePreferencesDto
  ) {
    return this.notificationService.updatePreferences(
      user.id,
      agencyId,
      dto.preferences
    );
  }
}
