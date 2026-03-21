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
 * Instagram OAuth 2.0 connector via Meta Graph API.
 *
 * Instagram uses the same OAuth flow as Facebook but with different scopes
 * and profile endpoints. Requires an Instagram Business or Creator account
 * linked to a Facebook Page.
 *
 * Required environment variables:
 *   INSTAGRAM_CLIENT_ID
 *   INSTAGRAM_CLIENT_SECRET
 */
@Injectable()
export class InstagramConnector implements OAuthConnector {
  private readonly apiVersion = "v22.0";
  private readonly authUrl = `https://www.facebook.com/${this.apiVersion}/dialog/oauth`;
  private readonly tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
  private readonly scopes = [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_insights",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_read_engagement",
  ];

  private get clientId(): string {
    const id = process.env["INSTAGRAM_CLIENT_ID"];
    if (!id) throw new InternalServerErrorException("INSTAGRAM_CLIENT_ID is not set");
    return id;
  }

  private get clientSecret(): string {
    const secret = process.env["INSTAGRAM_CLIENT_SECRET"];
    if (!secret) throw new InternalServerErrorException("INSTAGRAM_CLIENT_SECRET is not set");
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
        `Instagram token exchange failed: ${errorText}`
      );
    }

    const shortLived = (await response.json()) as {
      access_token: string;
      token_type: string;
    };

    // Exchange for long-lived token
    return this.exchangeForLongLivedToken(shortLived.access_token);
  }

  private async exchangeForLongLivedToken(
    shortLivedToken: string
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${this.tokenUrl}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Instagram long-lived token exchange failed: ${errorText}`
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

  async refreshToken(refreshTokenValue: string): Promise<OAuthTokens> {
    // Same pattern as Facebook — re-exchange the existing long-lived token
    return this.exchangeForLongLivedToken(refreshTokenValue);
  }

  async revokeToken(accessToken: string): Promise<void> {
    // Revoke by deleting permissions on the Facebook app
    try {
      const meParams = new URLSearchParams({ access_token: accessToken });
      const meResponse = await fetch(
        `https://graph.facebook.com/me?${meParams.toString()}`
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
    // Fetch the connected Facebook user to find their Instagram Business Account
    const meParams = new URLSearchParams({
      fields: "id,name,accounts{instagram_business_account{id,name,username,profile_picture_url}}",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.facebook.com/me?${meParams.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Instagram profile fetch failed: ${errorText}`
      );
    }

    const data = (await response.json()) as {
      id: string;
      name: string;
      accounts?: {
        data?: Array<{
          instagram_business_account?: {
            id: string;
            name?: string;
            username?: string;
            profile_picture_url?: string;
          };
        }>;
      };
    };

    // Attempt to extract the first Instagram Business Account
    const igAccount = data.accounts?.data?.find(
      (page) => page.instagram_business_account != null
    )?.instagram_business_account;

    if (igAccount) {
      return {
        platformUserId: igAccount.id,
        username: igAccount.username,
        displayName: igAccount.name,
        avatarUrl: igAccount.profile_picture_url,
      };
    }

    // Fall back to the Facebook user identity if no IG account is linked
    return {
      platformUserId: data.id,
      displayName: data.name,
    };
  }
}
