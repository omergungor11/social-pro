import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { WebhookVerificationService } from "./services/webhook-verification.service";
import { TwitterWebhookHandler } from "./handlers/twitter-webhook.handler";
import { FacebookWebhookHandler } from "./handlers/facebook-webhook.handler";
import { LinkedInWebhookHandler } from "./handlers/linkedin-webhook.handler";
import { TikTokWebhookHandler } from "./handlers/tiktok-webhook.handler";
import { YouTubeWebhookHandler } from "./handlers/youtube-webhook.handler";
import { PrismaService } from "../common/prisma/prisma.service";
import type { SocialPlatform } from "@social-pro/prisma";

/**
 * WebhookController
 *
 * Receives inbound webhooks from all supported social media platforms.
 *
 * IMPORTANT:
 *  - All routes carry @Public() — no JWT guard is applied.
 *  - Authenticity is enforced by per-platform HMAC signature verification.
 *  - Endpoints return HTTP 200 immediately to prevent platform retries;
 *    heavy processing is delegated to async handlers.
 *  - Raw body is required for HMAC verification. Ensure rawBody: true in
 *    the NestJS bootstrap and that these paths are excluded from the
 *    global JSON body parser if one is configured.
 */
@ApiTags("Social Platform Webhooks")
@Controller("webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly verification: WebhookVerificationService,
    private readonly twitterHandler: TwitterWebhookHandler,
    private readonly facebookHandler: FacebookWebhookHandler,
    private readonly linkedInHandler: LinkedInWebhookHandler,
    private readonly tikTokHandler: TikTokWebhookHandler,
    private readonly youtubeHandler: YouTubeWebhookHandler,
    private readonly prisma: PrismaService
  ) {}

  // ─── Facebook Verification Challenge ──────────────────────────────────────

  @Get("facebook")
  @Public()
  @ApiOperation({
    summary: "Facebook/Instagram webhook verification challenge",
    description:
      "Responds to the hub.challenge verification challenge sent by Facebook " +
      "when a webhook subscription is registered. hub.verify_token must match " +
      "the FACEBOOK_VERIFY_TOKEN environment variable.",
  })
  @ApiQuery({ name: "hub.mode", required: true, type: String })
  @ApiQuery({ name: "hub.challenge", required: true, type: String })
  @ApiQuery({ name: "hub.verify_token", required: true, type: String })
  @ApiResponse({ status: 200, description: "Challenge echoed back" })
  @ApiResponse({ status: 400, description: "Invalid verify token" })
  handleFacebookChallenge(
    @Query("hub.mode") mode: string,
    @Query("hub.challenge") challenge: string,
    @Query("hub.verify_token") verifyToken: string
  ): string {
    const expectedToken = process.env["FACEBOOK_VERIFY_TOKEN"] ?? "";

    if (mode !== "subscribe") {
      throw new BadRequestException(`Unsupported hub.mode: ${mode}`);
    }

    if (
      !this.verification.verifyFacebookChallenge(verifyToken, expectedToken)
    ) {
      this.logger.warn("facebook challenge: invalid verify_token received");
      throw new BadRequestException("Invalid hub.verify_token");
    }

    this.logger.log("facebook webhook subscription verified");
    return challenge;
  }

  // ─── Twitter ──────────────────────────────────────────────────────────────

  @Post("twitter")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Twitter Account Activity API webhook",
    description:
      "Receives Twitter webhook events. Signature is verified via " +
      "x-twitter-webhooks-signature header using TWITTER_WEBHOOK_SECRET.",
  })
  @ApiResponse({ status: 200, description: "Event received" })
  @ApiResponse({ status: 400, description: "Invalid signature" })
  async handleTwitterWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-twitter-webhooks-signature") signature: string
  ): Promise<{ received: boolean }> {
    const rawBody = this.extractRawBody(req, "twitter");
    const secret = process.env["TWITTER_WEBHOOK_SECRET"] ?? "";

    if (!this.verification.verifyTwitter(signature, rawBody, secret)) {
      this.logger.warn("twitter webhook: signature verification failed");
      throw new BadRequestException("Invalid Twitter webhook signature");
    }

    const payload = this.parseJsonBody(req, rawBody);

    await this.storeRawEvent("TWITTER" as SocialPlatform, payload);

    // Fire and forget — always respond 200 to avoid platform retries
    void this.twitterHandler.handle(payload).catch((err: unknown) => {
      this.logger.error("twitter handler async error", err);
    });

    return { received: true };
  }

  // ─── Facebook / Instagram ─────────────────────────────────────────────────

  @Post("facebook")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Facebook / Instagram Graph API webhook",
    description:
      "Receives Facebook and Instagram webhook events. Signature is verified " +
      "via x-hub-signature-256 header using FACEBOOK_WEBHOOK_SECRET.",
  })
  @ApiResponse({ status: 200, description: "Event received" })
  @ApiResponse({ status: 400, description: "Invalid signature" })
  async handleFacebookWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-hub-signature-256") signature: string
  ): Promise<{ received: boolean }> {
    const rawBody = this.extractRawBody(req, "facebook");
    const secret = process.env["FACEBOOK_WEBHOOK_SECRET"] ?? "";

    if (!this.verification.verifyFacebook(signature, rawBody, secret)) {
      this.logger.warn("facebook webhook: signature verification failed");
      throw new BadRequestException("Invalid Facebook webhook signature");
    }

    const payload = this.parseJsonBody(req, rawBody);

    await this.storeRawEvent("FACEBOOK" as SocialPlatform, payload);

    void this.facebookHandler.handle(payload).catch((err: unknown) => {
      this.logger.error("facebook handler async error", err);
    });

    return { received: true };
  }

  // ─── LinkedIn ─────────────────────────────────────────────────────────────

  @Post("linkedin")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "LinkedIn Events API webhook",
    description:
      "Receives LinkedIn webhook events. Signature is verified via " +
      "x-li-signature header using LINKEDIN_WEBHOOK_SECRET.",
  })
  @ApiResponse({ status: 200, description: "Event received" })
  @ApiResponse({ status: 400, description: "Invalid signature" })
  async handleLinkedInWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-li-signature") signature: string
  ): Promise<{ received: boolean }> {
    const rawBody = this.extractRawBody(req, "linkedin");
    const secret = process.env["LINKEDIN_WEBHOOK_SECRET"] ?? "";

    if (!this.verification.verifyLinkedIn(signature, rawBody, secret)) {
      this.logger.warn("linkedin webhook: signature verification failed");
      throw new BadRequestException("Invalid LinkedIn webhook signature");
    }

    const payload = this.parseJsonBody(req, rawBody);

    await this.storeRawEvent("LINKEDIN" as SocialPlatform, payload);

    void this.linkedInHandler.handle(payload).catch((err: unknown) => {
      this.logger.error("linkedin handler async error", err);
    });

    return { received: true };
  }

  // ─── TikTok ───────────────────────────────────────────────────────────────

  @Post("tiktok")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "TikTok Events API webhook",
    description:
      "Receives TikTok webhook events. Signature is verified via " +
      "x-tiktok-signature header using TIKTOK_WEBHOOK_SECRET.",
  })
  @ApiResponse({ status: 200, description: "Event received" })
  @ApiResponse({ status: 400, description: "Invalid signature" })
  async handleTikTokWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-tiktok-signature") signature: string
  ): Promise<{ received: boolean }> {
    const rawBody = this.extractRawBody(req, "tiktok");
    const secret = process.env["TIKTOK_WEBHOOK_SECRET"] ?? "";

    if (!this.verification.verifyTikTok(signature, rawBody, secret)) {
      this.logger.warn("tiktok webhook: signature verification failed");
      throw new BadRequestException("Invalid TikTok webhook signature");
    }

    const payload = this.parseJsonBody(req, rawBody);

    await this.storeRawEvent("TIKTOK" as SocialPlatform, payload);

    void this.tikTokHandler.handle(payload).catch((err: unknown) => {
      this.logger.error("tiktok handler async error", err);
    });

    return { received: true };
  }

  // ─── YouTube PubSubHubbub ─────────────────────────────────────────────────

  @Post("youtube")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "YouTube PubSubHubbub webhook",
    description:
      "Receives YouTube PubSubHubbub (WebSub) Atom XML notifications. " +
      "Signature is verified via x-hub-signature header using YOUTUBE_WEBHOOK_SECRET.",
  })
  @ApiResponse({ status: 200, description: "Notification received" })
  @ApiResponse({ status: 400, description: "Invalid signature" })
  async handleYouTubeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-hub-signature") signature: string
  ): Promise<{ received: boolean }> {
    const rawBody = this.extractRawBody(req, "youtube");
    const secret = process.env["YOUTUBE_WEBHOOK_SECRET"] ?? "";

    if (!this.verification.verifyYouTube(signature, rawBody, secret)) {
      this.logger.warn("youtube webhook: signature verification failed");
      throw new BadRequestException("Invalid YouTube webhook signature");
    }

    // YouTube sends Atom XML; parse key fields via regex to avoid xml2js dep
    const parsedPayload = this.parseYouTubeAtom(rawBody);

    await this.storeRawEvent("YOUTUBE" as SocialPlatform, parsedPayload);

    void this.youtubeHandler.handle(parsedPayload).catch((err: unknown) => {
      this.logger.error("youtube handler async error", err);
    });

    return { received: true };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Extracts the raw body buffer as a UTF-8 string.
   * Throws BadRequestException when rawBody is absent (bootstrap misconfiguration).
   */
  private extractRawBody(req: RawBodyRequest<Request>, platform: string): string {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        `Raw body is required for ${platform} webhook signature verification. ` +
          "Ensure rawBody: true is set in NestJS bootstrap."
      );
    }
    return rawBody.toString("utf8");
  }

  /**
   * Parses the request body as JSON. Falls back to an empty object on failure
   * so that handlers always receive a safe, non-null object.
   */
  private parseJsonBody(
    req: RawBodyRequest<Request>,
    rawBodyFallback: string
  ): Record<string, unknown> {
    // NestJS parses body automatically when content-type is application/json
    if (
      req.body !== null &&
      req.body !== undefined &&
      typeof req.body === "object"
    ) {
      return req.body as Record<string, unknown>;
    }
    // Fallback: parse raw body ourselves
    try {
      const parsed: unknown = JSON.parse(rawBodyFallback);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      this.logger.warn("parseJsonBody: body is not valid JSON");
    }
    return {};
  }

  /**
   * Parses a YouTube Atom XML string and extracts relevant fields using regex.
   * This avoids a heavy XML parser dependency for a small, predictable payload.
   */
  private parseYouTubeAtom(xml: string): Record<string, unknown> {
    const videoIdMatch = /<yt:videoId>([^<]+)<\/yt:videoId>/i.exec(xml);
    const channelIdMatch = /<yt:channelId>([^<]+)<\/yt:channelId>/i.exec(xml);
    const isDeleted = /<at:deleted-entry/i.test(xml);

    return {
      rawXml: xml,
      videoId: videoIdMatch?.[1] ?? null,
      channelId: channelIdMatch?.[1] ?? null,
      isDeleted,
    };
  }

  /**
   * Persists a raw webhook event to the database for audit / replay.
   * Failures are swallowed so they never block the 200 response.
   */
  private async storeRawEvent(
    platform: SocialPlatform,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      // Prisma Json field accepts Record<string, unknown> directly
      await this.prisma.rawWebhookEvent.create({
        data: {
          platform,
          payload: payload as object,
          processed: false,
        },
      });
    } catch (err) {
      this.logger.error(
        `storeRawEvent: failed to persist raw event for platform=${platform}`,
        err
      );
    }
  }
}
