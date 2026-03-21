import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  OAuthConnector,
  OAuthTokens,
  SocialProfile,
} from "../interfaces/oauth-connector.interface";

/**
 * Facebook (Meta Graph API) OAuth 2.0 connector.
 *
 * Exchanges the short-lived code for a long-lived token via the
 * server-side exchange endpoint after the initial code exchange.
 *
 * Required environment variables:
 *   FACEBOOK_CLIENT_ID
 *   FACEBOOK_CLIENT_SECRET
 */
@Injectable()
export class FacebookConnector implements OAuthConnector {
  private readonly apiVersion = "v22.0";
  private readonly authUrl = `https://www.facebook.com/${this.apiVersion}/dialog/oauth`;
  private readonly tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
  private readonly longLivedTokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
  private readonly profileUrl = "https://graph.facebook.com/me";
  private readonly scopes = [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "pages_read_user_content",
    "read_insights",
  ];

  private get clientId(): string {
    const id = process.env["FACEBOOK_CLIENT_ID"];
    if (!id) throw new BadRequestException("Facebook connection is not configured. Please add FACEBOOK_CLIENT_ID to your environment.");
    return id;
  }

  private get clientSecret(): string {
    const secret = process.env["FACEBOOK_CLIENT_SECRET"];
    if (!secret) throw new BadRequestException("Facebook connection is not configured. Please add FACEBOOK_CLIENT_SECRET to your environment.");
    return secret;
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(","),
      state,
      response_type: "code",
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    // Step 1: exchange code for short-lived token
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${this.tokenUrl}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Facebook token exchange failed: ${errorText}`
      );
    }

    const shortLived = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    // Step 2: exchange short-lived token for long-lived token (~60 days)
    return this.exchangeForLongLivedToken(shortLived.access_token);
  }

  /**
   * Exchanges a short-lived user access token for a long-lived one (~60 days).
   */
  private async exchangeForLongLivedToken(
    shortLivedToken: string
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${this.longLivedTokenUrl}?${params.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Facebook long-lived token exchange failed: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    const expiresAt =
      data.expires_in != null
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined;

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  }

  /**
   * Facebook long-lived tokens cannot be refreshed in the traditional sense.
   * Re-issuing is done by re-authenticating. Here we attempt to extend via
   * the long-lived exchange endpoint with the existing token.
   */
  async refreshToken(refreshTokenValue: string): Promise<OAuthTokens> {
    // Facebook does not use standard refresh tokens; re-exchange the token
    return this.exchangeForLongLivedToken(refreshTokenValue);
  }

  async revokeToken(accessToken: string): Promise<void> {
    // Requires the user ID; fetch it first
    try {
      const meParams = new URLSearchParams({ access_token: accessToken });
      const meResponse = await fetch(
        `${this.profileUrl}?${meParams.toString()}`
      );
      if (!meResponse.ok) return;

      const me = (await meResponse.json()) as { id: string };
      const deleteParams = new URLSearchParams({ access_token: accessToken });
      await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${me.id}/permissions?${deleteParams.toString()}`,
        { method: "DELETE" }
      );
    } catch {
      // Best-effort revocation
    }
  }

  async getUserProfile(accessToken: string): Promise<SocialProfile> {
    const params = new URLSearchParams({
      fields: "id,name,picture",
      access_token: accessToken,
    });

    const response = await fetch(`${this.profileUrl}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Facebook profile fetch failed: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      id: string;
      name: string;
      picture?: { data?: { url?: string } };
    };

    return {
      platformUserId: data.id,
      displayName: data.name,
      avatarUrl: data.picture?.data?.url,
    };
  }
}
