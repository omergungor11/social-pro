import { Injectable, UnauthorizedException } from "@nestjs/common";
import type {
  OAuthConnector,
  OAuthCredentials,
  OAuthTokens,
  SocialProfile,
} from "../interfaces/oauth-connector.interface";

/**
 * TikTok Login Kit OAuth 2.0 connector.
 *
 * Uses TikTok's v2 OAuth endpoints. The authorization code flow is
 * standard; the token response differs slightly from RFC 6749.
 *
 * Credentials are passed per-call from OAuthConfigService instead of being
 * read from environment variables directly.
 */
@Injectable()
export class TiktokConnector implements OAuthConnector {
  private readonly authUrl = "https://www.tiktok.com/v2/auth/authorize/";
  private readonly tokenUrl =
    "https://open.tiktokapis.com/v2/oauth/token/";
  private readonly revokeUrl =
    "https://open.tiktokapis.com/v2/oauth/revoke/";
  private readonly profileUrl =
    "https://open.tiktokapis.com/v2/user/info/";
  private readonly scopes = [
    "user.info.basic",
    "user.info.profile",
    "user.info.stats",
    "video.list",
    "video.upload",
    "video.publish",
  ];

  getAuthUrl(
    state: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): string {
    const effectiveScopes =
      credentials.scopes && credentials.scopes.length > 0
        ? credentials.scopes
        : this.scopes;

    const params = new URLSearchParams({
      client_key: credentials.clientId,
      response_type: "code",
      scope: effectiveScopes.join(","),
      redirect_uri: redirectUri,
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_key: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `TikTok token exchange failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      data?: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        refresh_expires_in?: number;
        scope?: string;
        token_type: string;
      };
      error?: string;
      error_description?: string;
    };

    if (data.error ?? !data.data) {
      throw new UnauthorizedException(
        `TikTok token exchange error: ${data.error_description ?? data.error ?? "Unknown error"}`,
      );
    }

    return this.mapTokenResponse(data.data!);
  }

  async refreshToken(
    refreshTokenValue: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_key: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `TikTok token refresh failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      data?: {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        scope?: string;
        token_type: string;
      };
      error?: string;
      error_description?: string;
    };

    if (data.error ?? !data.data) {
      throw new UnauthorizedException(
        `TikTok token refresh error: ${data.error_description ?? data.error ?? "Unknown error"}`,
      );
    }

    return this.mapTokenResponse(data.data!);
  }

  async revokeToken(
    accessToken: string,
    credentials: OAuthCredentials,
  ): Promise<void> {
    const body = new URLSearchParams({
      client_key: credentials.clientId,
      client_secret: credentials.clientSecret,
      token: accessToken,
    });

    await fetch(this.revokeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    // Best-effort revocation
  }

  async getUserProfile(accessToken: string): Promise<SocialProfile> {
    const params = new URLSearchParams({
      fields: "open_id,union_id,avatar_url,display_name,username",
    });

    const response = await fetch(`${this.profileUrl}?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `TikTok profile fetch failed: ${errorText}`,
      );
    }

    const json = (await response.json()) as {
      data?: {
        user?: {
          open_id: string;
          union_id?: string;
          avatar_url?: string;
          display_name?: string;
          username?: string;
        };
      };
      error?: { code?: string; message?: string };
    };

    const user = json.data?.user;
    if (!user) {
      throw new UnauthorizedException(
        `TikTok profile fetch error: ${json.error?.message ?? "No user data returned"}`,
      );
    }

    return {
      platformUserId: user.open_id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    };
  }

  private mapTokenResponse(data: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type: string;
  }): OAuthTokens {
    const expiresAt =
      data.expires_in != null
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined;

    const scopes = data.scope ? data.scope.split(",") : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scopes,
    };
  }
}
