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
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { AiService } from "./ai.service";
import { ContentTemplateService } from "./content-template.service";
import { GenerateContentDto } from "./dto/generate-content.dto";
import { GenerateImageDto } from "./dto/generate-image.dto";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";

@ApiTags("AI")
@ApiBearerAuth()
@Controller("ai")
@UseGuards(RolesGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly templateService: ContentTemplateService
  ) {}

  // ---------------------------------------------------------------------------
  // Generate content
  // ---------------------------------------------------------------------------

  @Post("generate")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Generate AI content",
    description:
      "Calls the configured AI provider (Claude primary, OpenAI fallback) and " +
      "persists the result as an AiGeneration record. Returns the generated text " +
      "and usage metadata.",
  })
  @ApiResponse({ status: 201, description: "Content generated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 500, description: "AI provider error" })
  async generate(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateContentDto
  ) {
    return this.aiService.generate(agencyId, user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Generate image
  // ---------------------------------------------------------------------------

  @Post("generate-image")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Generate an image with Gemini",
    description:
      "Calls Google Gemini (gemini-2.0-flash-exp) to generate an image from a text prompt. " +
      "Returns the image as a base64-encoded string alongside an AiGeneration record. " +
      "The base64 payload is not persisted; only metadata is stored in the database.",
  })
  @ApiResponse({
    status: 201,
    description: "Image generated successfully. Response includes imageBase64 and mimeType.",
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 500, description: "Gemini provider error or safety filter block" })
  async generateImage(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateImageDto
  ) {
    return this.aiService.generateImage(agencyId, user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Generation history
  // ---------------------------------------------------------------------------

  @Get("history")
  @ApiOperation({
    summary: "Get generation history",
    description:
      "Returns a paginated list of past AI generations for the agency, " +
      "ordered by most recent first.",
  })
  @ApiResponse({ status: 200, description: "History retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getHistory(
    @CurrentAgency() agencyId: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.aiService.getHistory(agencyId, pagination);
  }

  // ---------------------------------------------------------------------------
  // Usage stats
  // ---------------------------------------------------------------------------

  @Get("usage")
  @ApiOperation({
    summary: "Get AI usage stats",
    description:
      "Returns the current month's generation count and token usage " +
      "alongside the plan limit.",
  })
  @ApiResponse({ status: 200, description: "Usage stats retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getUsage(@CurrentAgency() agencyId: string) {
    return this.aiService.getUsage(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Templates — list
  // ---------------------------------------------------------------------------

  @Get("templates")
  @ApiOperation({
    summary: "List content templates",
    description:
      "Returns agency-specific templates plus system templates (read-only).",
  })
  @ApiResponse({ status: 200, description: "Templates retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async listTemplates(@CurrentAgency() agencyId: string) {
    return this.templateService.list(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Templates — create
  // ---------------------------------------------------------------------------

  @Post("templates")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a content template",
    description: "Creates a new agency-scoped content template.",
  })
  @ApiResponse({ status: 201, description: "Template created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async createTemplate(
    @CurrentAgency() agencyId: string,
    @Body() dto: CreateTemplateDto
  ) {
    return this.templateService.create(agencyId, dto);
  }

  // ---------------------------------------------------------------------------
  // Templates — update
  // ---------------------------------------------------------------------------

  @Patch("templates/:id")
  @ApiOperation({
    summary: "Update a content template",
    description:
      "Partially updates an agency-owned template. System templates are immutable.",
  })
  @ApiParam({ name: "id", description: "ContentTemplate ID" })
  @ApiResponse({ status: 200, description: "Template updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Cannot modify system template" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async updateTemplate(
    @CurrentAgency() agencyId: string,
    @Param("id") templateId: string,
    @Body() dto: UpdateTemplateDto
  ) {
    return this.templateService.update(agencyId, templateId, dto);
  }

  // ---------------------------------------------------------------------------
  // Templates — delete
  // ---------------------------------------------------------------------------

  @Delete("templates/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a content template",
    description:
      "Permanently deletes an agency-owned template. System templates cannot be deleted.",
  })
  @ApiParam({ name: "id", description: "ContentTemplate ID" })
  @ApiResponse({ status: 204, description: "Template deleted" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Cannot delete system template" })
  @ApiResponse({ status: 404, description: "Template not found" })
  async removeTemplate(
    @CurrentAgency() agencyId: string,
    @Param("id") templateId: string
  ): Promise<void> {
    return this.templateService.remove(agencyId, templateId);
  }
}
