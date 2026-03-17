import { Injectable } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import type { OAuthConnector } from "../interfaces/oauth-connector.interface";
import { TwitterConnector } from "../connectors/twitter.connector";
import { FacebookConnector } from "../connectors/facebook.connector";
import { InstagramConnector } from "../connectors/instagram.connector";
import { LinkedinConnector } from "../connectors/linkedin.connector";
import { TiktokConnector } from "../connectors/tiktok.connector";
import { YoutubeConnector } from "../connectors/youtube.connector";

/**
 * Registry that maps each SocialPlatform enum value to its connector instance.
 *
 * All connectors are injected via NestJS DI; the registry simply provides a
 * type-safe lookup. Callers throw a descriptive error when an unknown platform
 * is requested so failures surface clearly.
 */
@Injectable()
export class PlatformRegistryService {
  private readonly registry: Map<SocialPlatform, OAuthConnector>;

  constructor(
    private readonly twitterConnector: TwitterConnector,
    private readonly facebookConnector: FacebookConnector,
    private readonly instagramConnector: InstagramConnector,
    private readonly linkedinConnector: LinkedinConnector,
    private readonly tiktokConnector: TiktokConnector,
    private readonly youtubeConnector: YoutubeConnector
  ) {
    this.registry = new Map<SocialPlatform, OAuthConnector>([
      [SocialPlatform.TWITTER, this.twitterConnector],
      [SocialPlatform.FACEBOOK, this.facebookConnector],
      [SocialPlatform.INSTAGRAM, this.instagramConnector],
      [SocialPlatform.LINKEDIN, this.linkedinConnector],
      [SocialPlatform.TIKTOK, this.tiktokConnector],
      [SocialPlatform.YOUTUBE, this.youtubeConnector],
    ]);
  }

  /**
   * Returns the connector for the given platform.
   * @throws Error when no connector is registered for the platform.
   */
  getConnector(platform: SocialPlatform): OAuthConnector {
    const connector = this.registry.get(platform);
    if (!connector) {
      throw new Error(
        `No OAuth connector registered for platform: ${platform}`
      );
    }
    return connector;
  }
}
