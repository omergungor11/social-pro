export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface SocialProfile {
  platformUserId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

export interface OAuthConnector {
  /**
   * Returns the authorization URL to redirect the user to for OAuth consent.
   */
  getAuthUrl(
    state: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): string;

  /**
   * Exchanges an authorization code for access/refresh tokens.
   */
  exchangeCode(
    code: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens>;

  /**
   * Uses the refresh token to obtain a new access token.
   */
  refreshToken(
    refreshToken: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens>;

  /**
   * Revokes the given access token on the platform side.
   */
  revokeToken(
    accessToken: string,
    credentials: OAuthCredentials,
  ): Promise<void>;

  /**
   * Fetches the authenticated user's profile from the platform.
   */
  getUserProfile(accessToken: string): Promise<SocialProfile>;
}
