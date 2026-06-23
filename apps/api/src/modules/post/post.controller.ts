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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PostDeleteResult } from "@social-pro/shared-types";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { PostService } from "./post.service";
import { CreatePostDto, PostMediaInputDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostListQueryDto } from "./dto/post-list-query.dto";
import { SchedulePostDto } from "./dto/schedule-post.dto";

@ApiTags("Posts")
@ApiBearerAuth()
@Controller("posts")
@UseGuards(RolesGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: "List posts",
    description:
      "Returns a paginated list of posts for the agency. " +
      "Filter by status, platform, client, or date range.",
  })
  @ApiResponse({ status: 200, description: "Posts retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async list(
    @CurrentAgency() agencyId: string,
    @Query() query: PostListQueryDto
  ) {
    return this.postService.list(agencyId, query);
  }

  // ---------------------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------------------

  @Get("calendar")
  @ApiOperation({
    summary: "Calendar view",
    description:
      "Returns SCHEDULED and PUBLISHED posts within a date range, ordered by scheduledAt. " +
      "Suitable for populating a calendar UI.",
  })
  @ApiQuery({
    name: "startDate",
    description: "Range start (ISO-8601)",
    example: "2025-06-01T00:00:00Z",
  })
  @ApiQuery({
    name: "endDate",
    description: "Range end (ISO-8601)",
    example: "2025-06-30T23:59:59Z",
  })
  @ApiResponse({ status: 200, description: "Calendar posts retrieved" })
  @ApiResponse({ status: 400, description: "Invalid date range" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getCalendar(
    @CurrentAgency() agencyId: string,
    @Query("startDate") startDateStr: string,
    @Query("endDate") endDateStr: string
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("startDate and endDate must be valid ISO-8601 datetimes");
    }

    return this.postService.getCalendar(agencyId, startDate, endDate);
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a post",
    description:
      "Creates a new post in DRAFT status. " +
      "Optionally include targets (social accounts) and media attachments.",
  })
  @ApiResponse({ status: 201, description: "Post created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async create(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto
  ) {
    return this.postService.create(agencyId, user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Get one
  // ---------------------------------------------------------------------------

  @Get(":id")
  @ApiOperation({
    summary: "Get post detail",
    description: "Returns a single post with targets, media, and approvals.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Post retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async findOne(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string
  ) {
    return this.postService.findOne(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  @Patch(":id")
  @ApiOperation({
    summary: "Update a post",
    description:
      "Updates a post's content, title, client, or targets. " +
      "Only DRAFT and SCHEDULED posts can be updated.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Post updated" })
  @ApiResponse({ status: 400, description: "Post cannot be updated in its current status" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async update(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string,
    @Body() dto: UpdatePostDto
  ) {
    return this.postService.update(agencyId, postId, dto);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete a post",
    description:
      "Deletes a post and all associated targets and media records. " +
      "If the post is SCHEDULED, the scheduled job is also cancelled.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({
    status: 200,
    description: "Post deleted (with per-platform deletion results)",
  })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async remove(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string
  ): Promise<PostDeleteResult> {
    return this.postService.remove(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Schedule
  // ---------------------------------------------------------------------------

  @Post(":id/schedule")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Schedule a post",
    description:
      "Sets a future publish time for a DRAFT or SCHEDULED post. " +
      "A BullMQ delayed job is created (or rescheduled) to trigger publishing at that time.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Post scheduled" })
  @ApiResponse({ status: 400, description: "Invalid status or past scheduledAt" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async schedule(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string,
    @Body() dto: SchedulePostDto
  ) {
    return this.postService.schedule(agencyId, postId, new Date(dto.scheduledAt));
  }

  // ---------------------------------------------------------------------------
  // Publish now
  // ---------------------------------------------------------------------------

  @Post(":id/publish-now")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publish a post immediately",
    description:
      "Triggers an immediate publish of a DRAFT or SCHEDULED post. " +
      "Any existing scheduled job is cancelled before publishing.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Post published (or publish triggered)" })
  @ApiResponse({ status: 400, description: "Post cannot be published in its current status" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async publishNow(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string
  ) {
    return this.postService.publishNow(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel a scheduled post",
    description:
      "Cancels a SCHEDULED post, removing it from the publish queue and " +
      "resetting its status to CANCELLED.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Post cancelled" })
  @ApiResponse({ status: 400, description: "Post is not in SCHEDULED status" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async cancel(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string
  ) {
    return this.postService.cancel(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Attach media
  // ---------------------------------------------------------------------------

  @Post(":id/media")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Attach media to a post",
    description:
      "Appends one or more media records to an existing post. " +
      "Use the storageKey returned by the media upload endpoints.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiResponse({ status: 200, description: "Media attached" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async attachMedia(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string,
    @Body() mediaData: PostMediaInputDto[]
  ) {
    return this.postService.attachMedia(agencyId, postId, mediaData);
  }

  // ---------------------------------------------------------------------------
  // Remove media
  // ---------------------------------------------------------------------------

  @Delete(":id/media/:mediaId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Remove a media attachment from a post",
    description: "Removes a specific PostMedia record from the post.",
  })
  @ApiParam({ name: "id", description: "Post ID" })
  @ApiParam({ name: "mediaId", description: "PostMedia ID" })
  @ApiResponse({ status: 200, description: "Media removed" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Post or media not found" })
  async removeMedia(
    @CurrentAgency() agencyId: string,
    @Param("id") postId: string,
    @Param("mediaId") mediaId: string
  ) {
    return this.postService.removeMedia(agencyId, postId, mediaId);
  }
}
