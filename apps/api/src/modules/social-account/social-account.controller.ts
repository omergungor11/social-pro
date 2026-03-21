import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
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
import { SocialPlatform } from "@social-pro/prisma";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { Public } from "../auth/decorators/public.decorator";
import {
  SocialAccountService,
  AccountHealthStatus,
  OAuthInitiation,
  SocialAccountPublic,
} from "./social-account.service";
import { ListAccountsQueryDto } from "./dto/list-accounts-query.dto";

@ApiTags("Social Accounts")
@ApiBearerAuth()
@Controller("social-accounts")
@UseGuards(RolesGuard)
export class SocialAccountController {
  constructor(private readonly socialAccountService: SocialAccountService) {}

  // ---------------------------------------------------------------------------
  // List connected accounts
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: "List connected social accounts",
    description:
      "Returns all social accounts connected to the agency. " +
      "Optionally filter by platform, clientId, or isActive status. " +
      "Access tokens are never included in the response.",
  })
  @ApiResponse({ status: 200, description: "Accounts retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async list(
    @CurrentAgency() agencyId: string,
    @Query() query: ListAccountsQueryDto
  ): Promise<SocialAccountPublic[]> {
    return this.socialAccountService.listAccounts(agencyId, query);
  }

  // ---------------------------------------------------------------------------
  // OAuth — get authorization URL
  // ---------------------------------------------------------------------------

  @Get("oauth/:platform/url")
  @ApiOperation({
    summary: "Get OAuth authorization URL",
    description:
      "Returns the platform authorization URL and state token. " +
      "The frontend should redirect the user to authUrl. " +
      "The state value can be stored in the session for CSRF verification.",
  })
  @ApiParam({
    name: "platform",
    enum: SocialPlatform,
    description: "Target social platform",
  })
  @ApiResponse({ status: 200, description: "Auth URL generated" })
  @ApiResponse({ status: 400, description: "Unsupported platform" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  getOAuthUrl(
    @CurrentAgency() agencyId: string,
    @Param("platform") platform: string
  ): OAuthInitiation {
    const socialPlatform = this.parsePlatform(platform);
    return this.socialAccountService.initiateOAuth(agencyId, socialPlatform);
  }

  // ---------------------------------------------------------------------------
  // OAuth — callback (public — no JWT required, redirected from platform)
  // ---------------------------------------------------------------------------

  @Get("oauth/:platform/callback")
  @Public()
  @Redirect()
  @ApiOperation({
    summary: "Handle OAuth callback from platform",
    description:
      "This endpoint is the redirect URI registered with each platform. " +
      "It exchanges the authorization code for tokens, saves the account, " +
      "then redirects the user to the frontend success/error page. " +
      "No authentication header is required — this is called by the platform.",
  })
  @ApiParam({
    name: "platform",
    enum: SocialPlatform,
    description: "Platform that issued the callback",
  })
  @ApiQuery({ name: "code", description: "Authorization code from platform" })
  @ApiQuery({ name: "state", description: "State token for CSRF protection" })
  @ApiResponse({ status: 302, description: "Redirect to frontend after processing" })
  async handleCallback(
    @Param("platform") platform: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error?: string
  ): Promise<{ url: string }> {
    const frontendUrl =
      process.env["FRONTEND_URL"] ?? "http://localhost:3000";

    if (error) {
      return {
        url: `${frontendUrl}/dashboard/social-accounts?error=${encodeURIComponent(error)}`,
      };
    }

    try {
      const socialPlatform = this.parsePlatform(platform);
      const account = await this.socialAccountService.handleCallback(
        socialPlatform,
        code,
        state
      );

      return {
        url: `${frontendUrl}/dashboard/social-accounts?connected=${account.id}&platform=${platform}`,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth callback failed";
      return {
        url: `${frontendUrl}/dashboard/social-accounts?error=${encodeURIComponent(message)}`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Disconnect a social account",
    description:
      "Revokes the access token on the platform (best-effort) and permanently " +
      "removes the social account record from the database.",
  })
  @ApiParam({ name: "id", description: "Social account ID" })
  @ApiResponse({ status: 204, description: "Account disconnected successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Social account not found" })
  async disconnect(
    @CurrentAgency() agencyId: string,
    @Param("id") accountId: string
  ): Promise<void> {
    return this.socialAccountService.disconnect(agencyId, accountId);
  }

  // ---------------------------------------------------------------------------
  // Force token refresh
  // ---------------------------------------------------------------------------

  @Post(":id/refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Force a token refresh for a social account",
    description:
      "Immediately refreshes the access token using the stored refresh token. " +
      "Marks the account as inactive when refresh fails — the user will need " +
      "to reconnect.",
  })
  @ApiParam({ name: "id", description: "Social account ID" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 400, description: "Account has no refresh token" })
  @ApiResponse({ status: 401, description: "Token refresh failed or unauthenticated" })
  @ApiResponse({ status: 404, description: "Social account not found" })
  async refreshToken(
    @Param("id") accountId: string
  ): Promise<SocialAccountPublic> {
    return this.socialAccountService.refreshAccountToken(accountId);
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  @Get(":id/status")
  @ApiOperation({
    summary: "Check connection health for a social account",
    description:
      "Validates the stored access token by making a profile API call to the " +
      "platform. Returns health metadata without exposing token values.",
  })
  @ApiParam({ name: "id", description: "Social account ID" })
  @ApiResponse({ status: 200, description: "Health check completed" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Social account not found" })
  async checkStatus(
    @Param("id") accountId: string
  ): Promise<AccountHealthStatus> {
    return this.socialAccountService.checkHealth(accountId);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parsePlatform(raw: string): SocialPlatform {
    const upper = raw.toUpperCase();
    if (Object.values(SocialPlatform).includes(upper as SocialPlatform)) {
      return upper as SocialPlatform;
    }
    throw new Error(`Unsupported platform: ${raw}`);
  }
}
