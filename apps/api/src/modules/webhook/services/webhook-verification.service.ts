import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";

/**
 * WebhookVerificationService
 *
 * Provides HMAC-based signature verification for each supported social platform.
 * All comparisons use crypto.timingSafeEqual to prevent timing-based attacks.
 *
 * Required environment variables:
 *  - TWITTER_WEBHOOK_SECRET
 *  - FACEBOOK_WEBHOOK_SECRET
 *  - FACEBOOK_VERIFY_TOKEN
 *  - LINKEDIN_WEBHOOK_SECRET
 *  - TIKTOK_WEBHOOK_SECRET
 *  - YOUTUBE_WEBHOOK_SECRET
 */
@Injectable()
export class WebhookVerificationService {
  private readonly logger = new Logger(WebhookVerificationService.name);

  /**
   * Compares two strings in constant time to prevent timing attacks.
   */
  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a, "utf8");
      const bufB = Buffer.from(b, "utf8");
      if (bufA.length !== bufB.length) {
        // Still do a comparison to maintain constant time
        crypto.timingSafeEqual(bufA, bufA);
        return false;
      }
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Twitter CRC / webhook signature verification.
   * Header: x-twitter-webhooks-signature
   * Format: sha256=<base64_hmac>
   * Algorithm: HMAC-SHA256
   */
  verifyTwitter(signature: string, body: string, secret: string): boolean {
    if (!signature || !body || !secret) {
      this.logger.warn("Twitter verification: missing signature, body, or secret");
      return false;
    }
    try {
      const expected = `sha256=${crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("base64")}`;
      return this.safeCompare(signature, expected);
    } catch (err) {
      this.logger.error("Twitter signature verification failed", err);
      return false;
    }
  }

  /**
   * Facebook / Instagram webhook signature verification.
   * Header: x-hub-signature-256
   * Format: sha256=<hex_hmac>
   * Algorithm: HMAC-SHA256
   */
  verifyFacebook(signature: string, body: string, secret: string): boolean {
    if (!signature || !body || !secret) {
      this.logger.warn("Facebook verification: missing signature, body, or secret");
      return false;
    }
    try {
      const expected = `sha256=${crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex")}`;
      return this.safeCompare(signature, expected);
    } catch (err) {
      this.logger.error("Facebook signature verification failed", err);
      return false;
    }
  }

  /**
   * Facebook hub verification challenge.
   * Verifies that hub.verify_token matches the configured FACEBOOK_VERIFY_TOKEN.
   */
  verifyFacebookChallenge(verifyToken: string, expectedToken: string): boolean {
    if (!verifyToken || !expectedToken) {
      return false;
    }
    return this.safeCompare(verifyToken, expectedToken);
  }

  /**
   * LinkedIn webhook signature verification.
   * Header: x-li-signature
   * Format: sha256=<base64_hmac>
   * Algorithm: HMAC-SHA256
   */
  verifyLinkedIn(signature: string, body: string, secret: string): boolean {
    if (!signature || !body || !secret) {
      this.logger.warn("LinkedIn verification: missing signature, body, or secret");
      return false;
    }
    try {
      const expected = `sha256=${crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("base64")}`;
      return this.safeCompare(signature, expected);
    } catch (err) {
      this.logger.error("LinkedIn signature verification failed", err);
      return false;
    }
  }

  /**
   * TikTok webhook signature verification.
   * Header: x-tiktok-signature
   * Format: sha256=<hex_hmac>
   * Algorithm: HMAC-SHA256
   */
  verifyTikTok(signature: string, body: string, secret: string): boolean {
    if (!signature || !body || !secret) {
      this.logger.warn("TikTok verification: missing signature, body, or secret");
      return false;
    }
    try {
      const expected = `sha256=${crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex")}`;
      return this.safeCompare(signature, expected);
    } catch (err) {
      this.logger.error("TikTok signature verification failed", err);
      return false;
    }
  }

  /**
   * YouTube PubSubHubbub signature verification.
   * Header: x-hub-signature
   * Format: sha1=<hex_hmac>
   * Algorithm: HMAC-SHA1 (YouTube uses SHA1 for PubSubHubbub)
   */
  verifyYouTube(signature: string, body: string, secret: string): boolean {
    if (!signature || !body || !secret) {
      this.logger.warn("YouTube verification: missing signature, body, or secret");
      return false;
    }
    try {
      const expected = `sha1=${crypto
        .createHmac("sha1", secret)
        .update(body)
        .digest("hex")}`;
      return this.safeCompare(signature, expected);
    } catch (err) {
      this.logger.error("YouTube signature verification failed", err);
      return false;
    }
  }
}
