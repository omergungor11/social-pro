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

export interface OAuthConnector {
  /**
   * Returns the authorization URL to redirect the user to for OAuth consent.
   */
  getAuthUrl(state: string, redirectUri: string): string;

  /**
   * Exchanges an authorization code for access/refresh tokens.
   */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>;

  /**
   * Uses the refresh token to obtain a new access token.
   */
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Revokes the given access token on the platform side.
   */
  revokeToken(accessToken: string): Promise<void>;

  /**
   * Fetches the authenticated user's profile from the platform.
   */
  getUserProfile(accessToken: string): Promise<SocialProfile>;
}
