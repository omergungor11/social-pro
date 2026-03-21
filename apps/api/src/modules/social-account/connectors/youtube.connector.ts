import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  OAuthConnector,
  OAuthTokens,
  SocialProfile,
} from "../interfaces/oauth-connector.interface";

/**
 * YouTube (Google OAuth 2.0) connector.
 *
 * Uses Google's standard OAuth 2.0 Authorization Code flow. The profile is
 * fetched from the YouTube Data API v3 channels endpoint.
 *
 * Required environment variables:
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 */
@Injectable()
export class YoutubeConnector implements OAuthConnector {
  private readonly authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly tokenUrl = "https://oauth2.googleapis.com/token";
  private readonly revokeUrl = "https://oauth2.googleapis.com/revoke";
  private readonly profileUrl =
    "https://www.googleapis.com/youtube/v3/channels";
  private readonly scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  private get clientId(): string {
    const id = process.env["YOUTUBE_CLIENT_ID"];
    if (!id) throw new InternalServerErrorException("YOUTUBE_CLIENT_ID is not set");
    return id;
  }

  private get clientSecret(): string {
    const secret = process.env["YOUTUBE_CLIENT_SECRET"];
    if (!secret) throw new InternalServerErrorException("YOUTUBE_CLIENT_SECRET is not set");
    return secret;
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.scopes.join(" "),
      state,
      access_type: "offline", // Required to receive a refresh token
      prompt: "consent",      // Force consent screen to always get refresh token
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `YouTube token exchange failed: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type: string;
    };

    return this.mapTokenResponse(data);
  }

  async refreshToken(refreshTokenValue: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshTokenValue,
      grant_type: "refresh_token",
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `YouTube token refresh failed: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type: string;
    };

    // Google does not re-issue a refresh token on refresh; keep the existing one
    return this.mapTokenResponse(data);
  }

  async revokeToken(accessToken: string): Promise<void> {
    const params = new URLSearchParams({ token: accessToken });

    await fetch(`${this.revokeUrl}?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    // Best-effort revocation
  }

  async getUserProfile(accessToken: string): Promise<SocialProfile> {
    const params = new URLSearchParams({
      part: "snippet",
      mine: "true",
    });

    const response = await fetch(`${this.profileUrl}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `YouTube profile fetch failed: ${errorText}`
      );
    }

    const json = (await response.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          customUrl?: string;
          thumbnails?: {
            default?: { url?: string };
          };
        };
      }>;
    };

    const channel = json.items?.[0];
    if (!channel) {
      throw new UnauthorizedException(
        "YouTube profile fetch: no channel found for this account"
      );
    }

    return {
      platformUserId: channel.id,
      username: channel.snippet?.customUrl,
      displayName: channel.snippet?.title,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
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

    const scopes = data.scope ? data.scope.split(" ") : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scopes,
    };
  }
}
