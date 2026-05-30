import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import type {
  OAuthConnector,
  OAuthCredentials,
  OAuthTokens,
  SocialProfile,
} from "../interfaces/oauth-connector.interface";

/**
 * Twitter (X) OAuth 2.0 connector using PKCE (Proof Key for Code Exchange).
 *
 * Credentials are passed per-call from OAuthConfigService instead of being
 * read from environment variables directly.
 */
@Injectable()
export class TwitterConnector implements OAuthConnector {
  private readonly authUrl = "https://twitter.com/i/oauth2/authorize";
  private readonly tokenUrl = "https://api.twitter.com/2/oauth2/token";
  private readonly profileUrl = "https://api.twitter.com/2/users/me";
  private readonly revokeUrl = "https://api.twitter.com/2/oauth2/revoke";
  private readonly scopes = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access",
  ];

  /**
   * Generates a PKCE code verifier (random 43-128 char string).
   * The verifier is embedded in the state so it can be retrieved during callback.
   */
  private generateCodeVerifier(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Derives the S256 code challenge from the verifier.
   */
  private generateCodeChallenge(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
  }

  /**
   * Returns the OAuth authorization URL. The state string is expected to
   * contain the PKCE verifier as `<agencyId>:<codeVerifier>` (callers must
   * split on first colon to separate them).
   */
  getAuthUrl(
    state: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): string {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Append the verifier to the state so callback can reconstruct it
    const stateWithVerifier = `${state}:${codeVerifier}`;

    const effectiveScopes =
      credentials.scopes && credentials.scopes.length > 0
        ? credentials.scopes
        : this.scopes;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      scope: effectiveScopes.join(" "),
      state: stateWithVerifier,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchanges the authorization code and PKCE verifier for tokens.
   * The `code` parameter must be the raw code; the `redirectUri` carries
   * the verifier via the `codeVerifier` query param convention. Because
   * the interface does not expose a separate verifier argument, callers
   * should pass `code` as `<code>:<codeVerifier>` (colon-separated).
   */
  async exchangeCode(
    code: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    // Convention: code is passed as "<authCode>:<codeVerifier>"
    const separatorIndex = code.indexOf(":");
    const authCode = separatorIndex >= 0 ? code.slice(0, separatorIndex) : code;
    const codeVerifier =
      separatorIndex >= 0 ? code.slice(separatorIndex + 1) : "";

    const basicCredentials = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicCredentials}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Twitter token exchange failed: ${errorText}`,
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

  async refreshToken(
    refreshTokenValue: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    const basicCredentials = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenValue,
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicCredentials}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Twitter token refresh failed: ${errorText}`,
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
    const basicCredentials = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`,
    ).toString("base64");

    const body = new URLSearchParams({
      token: accessToken,
      token_type_hint: "access_token",
    });

    await fetch(this.revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicCredentials}`,
      },
      body: body.toString(),
    });
    // Best-effort revocation — do not throw on non-2xx
  }

  async getUserProfile(accessToken: string): Promise<SocialProfile & {
    followersCount?: number;
    followingCount?: number;
    tweetCount?: number;
    description?: string;
  }> {
    const params = new URLSearchParams({
      "user.fields": "id,name,username,profile_image_url,description,public_metrics",
    });

    const response = await fetch(`${this.profileUrl}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Twitter profile fetch failed: ${errorText}`,
      );
    }

    const json = (await response.json()) as {
      data: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
        description?: string;
        public_metrics?: {
          followers_count?: number;
          following_count?: number;
          tweet_count?: number;
        };
      };
    };

    return {
      platformUserId: json.data.id,
      username: json.data.username,
      displayName: json.data.name,
      avatarUrl: json.data.profile_image_url,
      description: json.data.description,
      followersCount: json.data.public_metrics?.followers_count,
      followingCount: json.data.public_metrics?.following_count,
      tweetCount: json.data.public_metrics?.tweet_count,
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
