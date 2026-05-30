import { Injectable, UnauthorizedException } from "@nestjs/common";
import type {
  OAuthConnector,
  OAuthCredentials,
  OAuthTokens,
  SocialProfile,
} from "../interfaces/oauth-connector.interface";

/**
 * Facebook (Meta Graph API) OAuth 2.0 connector.
 *
 * Exchanges the short-lived code for a long-lived token via the
 * server-side exchange endpoint after the initial code exchange.
 *
 * Credentials are passed per-call from OAuthConfigService instead of being
 * read from environment variables directly.
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
    "business_management",
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
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      scope: effectiveScopes.join(","),
      state,
      response_type: "code",
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Stores the short-lived user token from the most recent code exchange.
   * getPages() should be called with this token before it expires.
   */
  private lastShortLivedToken: string | null = null;

  getLastShortLivedToken(): string | null {
    return this.lastShortLivedToken;
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    // Step 1: exchange code for short-lived token
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${this.tokenUrl}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Facebook token exchange failed: ${errorText}`,
      );
    }

    const shortLived = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    // Save short-lived token for getPages() call
    this.lastShortLivedToken = shortLived.access_token;

    // Step 2: exchange short-lived token for long-lived token (~60 days)
    return this.exchangeForLongLivedToken(shortLived.access_token, credentials);
  }

  /**
   * Exchanges a short-lived user access token for a long-lived one (~60 days).
   */
  private async exchangeForLongLivedToken(
    shortLivedToken: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${this.longLivedTokenUrl}?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new UnauthorizedException(
        `Facebook long-lived token exchange failed: ${errorText}`,
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
  async refreshToken(
    refreshTokenValue: string,
    credentials: OAuthCredentials,
  ): Promise<OAuthTokens> {
    // Facebook does not use standard refresh tokens; re-exchange the token
    return this.exchangeForLongLivedToken(refreshTokenValue, credentials);
  }

  async revokeToken(
    accessToken: string,
    _credentials: OAuthCredentials,
  ): Promise<void> {
    // Requires the user ID; fetch it first
    try {
      const meParams = new URLSearchParams({ access_token: accessToken });
      const meResponse = await fetch(
        `${this.profileUrl}?${meParams.toString()}`,
      );
      if (!meResponse.ok) return;

      const me = (await meResponse.json()) as { id: string };
      const deleteParams = new URLSearchParams({ access_token: accessToken });
      await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${me.id}/permissions?${deleteParams.toString()}`,
        { method: "DELETE" },
      );
    } catch {
      // Best-effort revocation
    }
  }

  async getPages(accessToken: string): Promise<Array<{
    id: string;
    name: string;
    accessToken: string;
    pictureUrl?: string;
    followersCount?: number;
    category?: string;
  }>> {
    type PageItem = {
      id: string;
      name: string;
      access_token: string;
      picture?: { data?: { url?: string } };
      fan_count?: number;
      followers_count?: number;
      category?: string;
    };

    const allPages: PageItem[] = [];

    let url =
      `https://graph.facebook.com/${this.apiVersion}/me/accounts` +
      `?fields=id,name,access_token,picture{url},fan_count,followers_count,category` +
      `&limit=100&access_token=${accessToken}`;

    // Follow pagination
    while (url) {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("[FacebookConnector] /me/accounts error:", errorText);
        throw new UnauthorizedException(
          `Failed to fetch Facebook pages: ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        data?: PageItem[];
        paging?: { next?: string };
      };

      console.log("[FacebookConnector] /me/accounts page:", data.data?.length ?? 0, "pages:", data.data?.map(p => p.name));

      if (data.data) {
        allPages.push(...data.data);
      }

      url = data.paging?.next ?? "";
    }

    console.log("[FacebookConnector] /me/accounts total:", allPages.length, allPages.map(p => p.name));

    // Also fetch pages from Business Manager (if user has business_management permission)
    try {
      const bizResp = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me/businesses?fields=id,name&access_token=${accessToken}`,
      );
      if (bizResp.ok) {
        const bizData = (await bizResp.json()) as { data?: Array<{ id: string; name: string }> };
        const businesses = bizData.data ?? [];
        console.log("[FacebookConnector] Businesses found:", businesses.length, businesses.map(b => b.name));

        const existingPageIds = new Set(allPages.map((p) => p.id));

        for (const biz of businesses) {
          // owned_pages
          const ownedResp = await fetch(
            `https://graph.facebook.com/${this.apiVersion}/${biz.id}/owned_pages` +
            `?fields=id,name,access_token,picture{url},fan_count,followers_count,category` +
            `&limit=100&access_token=${accessToken}`,
          );
          if (ownedResp.ok) {
            const ownedData = (await ownedResp.json()) as { data?: PageItem[] };
            for (const page of ownedData.data ?? []) {
              if (!existingPageIds.has(page.id)) {
                allPages.push(page);
                existingPageIds.add(page.id);
                console.log("[FacebookConnector] Business page added:", page.name);
              }
            }
          }

          // client_pages
          const clientResp = await fetch(
            `https://graph.facebook.com/${this.apiVersion}/${biz.id}/client_pages` +
            `?fields=id,name,access_token,picture{url},fan_count,followers_count,category` +
            `&limit=100&access_token=${accessToken}`,
          );
          if (clientResp.ok) {
            const clientData = (await clientResp.json()) as { data?: PageItem[] };
            for (const page of clientData.data ?? []) {
              if (!existingPageIds.has(page.id)) {
                allPages.push(page);
                existingPageIds.add(page.id);
                console.log("[FacebookConnector] Client page added:", page.name);
              }
            }
          }
        }
      } else {
        console.log("[FacebookConnector] /me/businesses failed (no business_management permission?):", bizResp.status);
      }
    } catch (err) {
      console.log("[FacebookConnector] Business pages fetch error (non-fatal):", err);
    }

    console.log("[FacebookConnector] Total pages found:", allPages.length, allPages.map(p => p.name));

    return allPages.map((page) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      pictureUrl: page.picture?.data?.url,
      followersCount: page.followers_count ?? page.fan_count ?? 0,
      category: page.category,
    }));
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
        `Facebook profile fetch failed: ${errorText}`,
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
