import { Injectable, UnauthorizedException } from "@nestjs/common";
import type {
  OAuthConnector,
  OAuthCredentials,
  OAuthTokens,
  SocialProfile,
} from "../interfaces/oauth-connector.interface";

/**
 * LinkedIn OAuth 2.0 connector.
 *
 * Uses the standard Authorization Code flow. The OpenID Connect userinfo
 * endpoint (/v2/userinfo) is used for profile data — it requires the
 * `openid`, `profile`, and `email` scopes in addition to the marketing scopes.
 *
 * Credentials are passed per-call from OAuthConfigService instead of being
 * read from environment variables directly.
 */
@Injectable()
export class LinkedinConnector implements OAuthConnector {
  private readonly authUrl =
    "https://www.linkedin.com/oauth/v2/authorization";
  private readonly tokenUrl =
    "https://www.linkedin.com/oauth/v2/accessToken";
  private readonly profileUrl = "https://api.linkedin.com/v2/userinfo";
  private readonly revokeUrl = "https://www.linkedin.com/oauth/v2/revoke";
  private readonly scopes = [
    "openid",
    "profile",
    "email",
    "w_member_social",
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
      response_type: "code",
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      scope: effectiveScopes.join(" "),
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
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `LinkedIn token exchange failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_token_expires_in?: number;
      scope?: string;
    };

    return this.mapTokenResponse(data);
  }

  async refreshToken(
    refreshTokenValue: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `LinkedIn token refresh failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    return this.mapTokenResponse(data);
  }

  async revokeToken(
    accessToken: string,
    credentials: OAuthCredentials,
  ): Promise<void> {
    const body = new URLSearchParams({
      client_id: credentials.clientId,
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
    const response = await fetch(this.profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `LinkedIn profile fetch failed: ${errorText}`,
      );
    }

    const data = (await response.json()) as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      email?: string;
    };

    const displayName =
      data.name ??
      ([data.given_name, data.family_name].filter(Boolean).join(" ") ||
        undefined);

    return {
      platformUserId: data.sub,
      username: data.email,
      displayName,
      avatarUrl: data.picture,
    };
  }

  private mapTokenResponse(data: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
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
