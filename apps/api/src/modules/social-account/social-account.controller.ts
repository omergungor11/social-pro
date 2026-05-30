import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
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
import { PlatformAvailability } from "./services/oauth-config.service";
import { ListAccountsQueryDto } from "./dto/list-accounts-query.dto";
import { SelectFacebookPageDto } from "./dto/select-facebook-page.dto";

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
    @Query() query: ListAccountsQueryDto,
  ): Promise<SocialAccountPublic[]> {
    return this.socialAccountService.listAccounts(agencyId, query);
  }

  // ---------------------------------------------------------------------------
  // Platform availability
  // ---------------------------------------------------------------------------

  @Get("platforms/available")
  @ApiOperation({
    summary: "List available social platforms",
    description:
      "Returns which platforms have OAuth credentials configured " +
      "(either via database or environment variables). " +
      "Use this to determine which connect buttons to enable in the UI.",
  })
  @ApiResponse({
    status: 200,
    description: "Platform availability list",
  })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getAvailablePlatforms(): Promise<PlatformAvailability[]> {
    return this.socialAccountService.getAvailablePlatforms();
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
  @ApiResponse({
    status: 400,
    description: "Unsupported platform or credentials not configured",
  })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getOAuthUrl(
    @CurrentAgency() agencyId: string,
    @Param("platform") platform: string,
  ): Promise<OAuthInitiation> {
    const socialPlatform = this.parsePlatform(platform);
    return this.socialAccountService.initiateOAuth(agencyId, socialPlatform);
  }

  // ---------------------------------------------------------------------------
  // OAuth — callback (public — no JWT required, redirected from platform)
  // ---------------------------------------------------------------------------

  @Get("oauth/:platform/callback")
  @Public()
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
  @ApiResponse({
    status: 302,
    description: "Redirect to frontend after processing",
  })
  async handleCallback(
    @Param("platform") platform: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const frontendUrl =
      process.env["FRONTEND_URL"] || process.env["CORS_ORIGIN"] || "http://localhost:3000";

    const redirect = (url: string): void => {
      res!.redirect(302, url);
    };

    if (error) {
      return redirect(
        `${frontendUrl}/dashboard/social-accounts?error=${encodeURIComponent(error)}`,
      );
    }

    try {
      const socialPlatform = this.parsePlatform(platform);

      // Facebook: use page selection flow
      if (socialPlatform === SocialPlatform.FACEBOOK) {
        const result = await this.socialAccountService.handleFacebookCallback(
          code,
          state,
        );

        if (result.type === "none") {
          return redirect(
            `${frontendUrl}/dashboard/social-accounts?error=${encodeURIComponent("No Facebook Pages found. Please create a Facebook Page first.")}`,
          );
        }

        // Show page selection modal (even for single page — let user confirm)
        // Access tokens are kept server-side in cache — NOT sent to frontend
        const pagesData = (result.pages ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          pictureUrl: p.pictureUrl,
          followersCount: p.followersCount,
          category: p.category,
        }));
        const encoded = Buffer.from(JSON.stringify(pagesData)).toString("base64url");

        return redirect(
          `${frontendUrl}/dashboard/social-accounts?selectPages=true&pages=${encoded}&agencyId=${result.agencyId}`,
        );
      }

      // Instagram: account selection flow (multiple IG accounts across pages)
      if (socialPlatform === SocialPlatform.INSTAGRAM) {
        const result = await this.socialAccountService.handleInstagramCallback(
          code,
          state,
        );

        if (result.type === "none") {
          return redirect(
            `${frontendUrl}/dashboard/social-accounts?error=${encodeURIComponent("No Instagram Business accounts found. Make sure your Instagram is linked to a Facebook Page.")}`,
          );
        }

        const accountsData = (result.accounts ?? []).map((a) => ({
          igId: a.igId,
          username: a.username,
          name: a.name,
          profilePictureUrl: a.profilePictureUrl,
          followersCount: a.followersCount,
        }));
        const encoded = Buffer.from(JSON.stringify(accountsData)).toString("base64url");

        return redirect(
          `${frontendUrl}/dashboard/social-accounts?selectInstagram=true&accounts=${encoded}&agencyId=${result.agencyId}`,
        );
      }

      // All other platforms: existing flow
      const account = await this.socialAccountService.handleCallback(
        socialPlatform,
        code,
        state,
      );

      return redirect(
        `${frontendUrl}/dashboard/social-accounts?connected=${account.id}&platform=${platform}`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth callback failed";
      return redirect(
        `${frontendUrl}/dashboard/social-accounts?error=${encodeURIComponent(message)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Facebook Page selection
  // ---------------------------------------------------------------------------

  @Post("oauth/facebook/select-page")
  @ApiOperation({
    summary: "Connect a selected Facebook Page",
    description:
      "After the Facebook OAuth callback returns multiple pages, " +
      "the frontend calls this endpoint with the selected page details " +
      "to finalize the connection.",
  })
  @ApiResponse({ status: 201, description: "Facebook page connected" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async selectFacebookPage(
    @CurrentAgency() agencyId: string,
    @Body() body: SelectFacebookPageDto,
  ): Promise<SocialAccountPublic> {
    return this.socialAccountService.connectFacebookPage(agencyId, {
      pageId: body.pageId,
      pageName: body.pageName,
      pictureUrl: body.pictureUrl,
      followersCount: body.followersCount,
      category: body.category,
    });
  }

  // ---------------------------------------------------------------------------
  // Instagram account selection
  // ---------------------------------------------------------------------------

  @Post("oauth/instagram/select-account")
  @ApiOperation({
    summary: "Connect a selected Instagram account",
    description:
      "After the Instagram OAuth callback returns multiple IG accounts, " +
      "the frontend calls this endpoint with the selected account details.",
  })
  @ApiResponse({ status: 201, description: "Instagram account connected" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async selectInstagramAccount(
    @CurrentAgency() agencyId: string,
    @Body() body: { igId: string; username?: string; name?: string; profilePictureUrl?: string; followersCount?: number },
  ): Promise<SocialAccountPublic> {
    return this.socialAccountService.connectInstagramAccount(agencyId, body);
  }

  // ---------------------------------------------------------------------------
  // Get single account profile
  // ---------------------------------------------------------------------------

  @Get(":id")
  @ApiOperation({ summary: "Get social account profile details" })
  @ApiParam({ name: "id", description: "Social account ID" })
  @ApiResponse({ status: 200, description: "Account retrieved" })
  @ApiResponse({ status: 404, description: "Account not found" })
  async findOne(
    @CurrentAgency() agencyId: string,
    @Param("id") accountId: string,
  ): Promise<SocialAccountPublic> {
    return this.socialAccountService.findOne(agencyId, accountId);
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
    @Param("id") accountId: string,
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
  @ApiResponse({
    status: 401,
    description: "Token refresh failed or unauthenticated",
  })
  @ApiResponse({ status: 404, description: "Social account not found" })
  async refreshToken(
    @Param("id") accountId: string,
  ): Promise<SocialAccountPublic> {
    return this.socialAccountService.refreshAccountToken(accountId);
  }

  // ---------------------------------------------------------------------------
  // Sync posts from platform
  // ---------------------------------------------------------------------------

  @Post(":id/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Sync posts from platform",
    description:
      "Fetches recent posts/media from the connected social platform and stores them locally. " +
      "Currently supports INSTAGRAM and FACEBOOK. Returns a count of newly synced posts.",
  })
  @ApiParam({ name: "id", description: "Social account ID" })
  @ApiResponse({ status: 200, description: "Sync completed" })
  @ApiResponse({ status: 404, description: "Social account not found" })
  async syncFromPlatform(
    @CurrentAgency() agencyId: string,
    @Param("id") accountId: string,
    @Query("force") force?: string,
  ): Promise<{ synced: number; message: string; skipped?: boolean }> {
    return this.socialAccountService.syncFromPlatform(agencyId, accountId, force === "true");
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
    @Param("id") accountId: string,
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
