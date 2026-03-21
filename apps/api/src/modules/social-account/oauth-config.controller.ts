import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { SocialPlatform } from "@social-pro/prisma";
import { UserRole } from "@social-pro/shared-types";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import {
  OAuthConfigService,
  PlatformAvailability,
  PlatformOAuthConfigPublic,
} from "./services/oauth-config.service";
import { UpsertOAuthConfigDto } from "./dto/upsert-oauth-config.dto";

@ApiTags("OAuth Config (Admin)")
@ApiBearerAuth()
@Controller("admin/oauth-configs")
@UseGuards(RolesGuard)
export class OAuthConfigController {
  constructor(private readonly oauthConfigService: OAuthConfigService) {}

  // ---------------------------------------------------------------------------
  // List all configs
  // ---------------------------------------------------------------------------

  @Get()
  @Roles(UserRole.OWNER)
  @ApiOperation({
    summary: "List all platform OAuth configs",
    description:
      "Returns all stored platform OAuth configurations. " +
      "Client secrets are masked — only the last 4 characters of the client ID are shown. " +
      "Requires OWNER role.",
  })
  @ApiResponse({
    status: 200,
    description: "Configurations retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Insufficient role" })
  async list(): Promise<PlatformOAuthConfigPublic[]> {
    return this.oauthConfigService.getAllConfigs();
  }

  // ---------------------------------------------------------------------------
  // Upsert config for a platform
  // ---------------------------------------------------------------------------

  @Post(":platform")
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Create or update OAuth credentials for a platform",
    description:
      "Encrypts and stores the client ID and secret for the given platform. " +
      "If a config already exists it is replaced. " +
      "Requires OWNER role.",
  })
  @ApiParam({
    name: "platform",
    enum: SocialPlatform,
    description: "Target social platform",
  })
  @ApiResponse({
    status: 204,
    description: "Config saved successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid platform or request body" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Insufficient role" })
  async upsert(
    @Param("platform") platform: string,
    @Body() dto: UpsertOAuthConfigDto,
  ): Promise<void> {
    const socialPlatform = this.parsePlatform(platform);

    await this.oauthConfigService.upsertConfig(
      socialPlatform,
      dto.clientId,
      dto.clientSecret,
      {
        scopes: dto.scopes,
        redirectUri: dto.redirectUri,
        isEnabled: dto.isEnabled,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Delete config for a platform
  // ---------------------------------------------------------------------------

  @Delete(":platform")
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete OAuth credentials for a platform",
    description:
      "Removes the stored credentials for the given platform from the database. " +
      "After deletion the system falls back to environment variables. " +
      "Requires OWNER role.",
  })
  @ApiParam({
    name: "platform",
    enum: SocialPlatform,
    description: "Target social platform",
  })
  @ApiResponse({ status: 204, description: "Config deleted successfully" })
  @ApiResponse({
    status: 404,
    description: "No config found for the given platform",
  })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Insufficient role" })
  async remove(@Param("platform") platform: string): Promise<void> {
    const socialPlatform = this.parsePlatform(platform);
    await this.oauthConfigService.deleteConfig(socialPlatform);
  }

  // ---------------------------------------------------------------------------
  // Test credentials for a platform
  // ---------------------------------------------------------------------------

  @Post(":platform/test")
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Test whether credentials are resolvable for a platform",
    description:
      "Checks if credentials can be resolved for the given platform (via DB or env vars). " +
      "Does not make a live API call to the platform — only verifies that credentials are present. " +
      "Requires OWNER role.",
  })
  @ApiParam({
    name: "platform",
    enum: SocialPlatform,
    description: "Target social platform",
  })
  @ApiResponse({
    status: 200,
    description: "Credential resolution result",
    schema: {
      type: "object",
      properties: {
        platform: { type: "string" },
        credentialsFound: { type: "boolean" },
        source: { type: "string", enum: ["database", "env", "none"] },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 403, description: "Insufficient role" })
  async test(
    @Param("platform") platform: string,
  ): Promise<{
    platform: string;
    credentialsFound: boolean;
    source: PlatformAvailability["source"];
  }> {
    const socialPlatform = this.parsePlatform(platform);

    const availability = await this.oauthConfigService.getAvailablePlatforms();
    const entry = availability.find((a) => a.platform === socialPlatform);

    return {
      platform: socialPlatform,
      credentialsFound: entry?.isAvailable ?? false,
      source: entry?.source ?? "none",
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parsePlatform(raw: string): SocialPlatform {
    const upper = raw.toUpperCase();
    if (Object.values(SocialPlatform).includes(upper as SocialPlatform)) {
      return upper as SocialPlatform;
    }
    throw new NotFoundException(`Unsupported platform: ${raw}`);
  }
}
