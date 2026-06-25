import { SocialPlatform } from "@social-pro/prisma";

/**
 * Structured post content passed to platform publishers.
 *
 * `text` is the core body. Additional keys are platform-specific overrides
 * (e.g. `hashtags`, `link`, `altText`). Publishers read only the keys they
 * understand and ignore the rest.
 */
export interface PublishContent {
  /** Main text body of the post */
  text: string;
  /** Optional link to attach (supported by Facebook, LinkedIn) */
  link?: string;
  /** Optional hashtag array (Twitter, Instagram, LinkedIn) */
  hashtags?: string[];
  /** Media URLs attached to this post */
  mediaUrls?: string[];
  /** Platform-specific overrides from PostTarget.platformSpecificContent */
  platformOverrides?: Record<string, unknown>;
  /** Optional place/location to attach (FB `place`, IG `location_id`). */
  location?: { id: string; name?: string } | null;
  /** Optional comment posted right after the main post (e.g. hashtags). */
  firstComment?: string | null;
  /** Usernames to tag (IG user_tags; FB best-effort). */
  userTags?: string[];
  /** Raw content JSON from the Post model */
  raw: Record<string, unknown>;
}

/**
 * Decrypted social account credentials passed to the publisher.
 */
export interface DecryptedAccount {
  id: string;
  platform: SocialPlatform;
  platformUserId: string;
  platformUsername: string | null;
  accessToken: string;
  refreshToken: string | null;
}

/**
 * Result returned by a successful publish operation.
 */
export interface PublishResult {
  /** Platform-assigned post/tweet/share ID */
  platformPostId: string;
  /** Canonical URL to the published post */
  platformUrl: string;
  /** Timestamp when the post was accepted by the platform */
  publishedAt: Date;
}

/**
 * Contract that every platform publisher must implement.
 *
 * Each adapter handles a single social platform and is responsible for:
 *  - Translating `PublishContent` into the platform's API payload
 *  - Calling the platform API
 *  - Returning a `PublishResult` on success or throwing on failure
 */
export interface PlatformPublisher {
  /**
   * Publishes the given content on behalf of `account`.
   *
   * @throws Error with a descriptive message on API failure.
   */
  publish(content: PublishContent, account: DecryptedAccount): Promise<PublishResult>;

  /**
   * Returns the maximum character limit for the platform's text field.
   * Used by callers to truncate or warn before publishing.
   */
  getCharacterLimit(): number;

  /**
   * Deletes/unpublishes a previously published post from the platform.
   *
   * Optional — platforms that don't support deletion via API (e.g. Instagram)
   * may omit it. Implementations should throw on API failure so the caller can
   * log it; callers treat deletion as best-effort and never block on it.
   */
  unpublish?(platformPostId: string, account: DecryptedAccount): Promise<void>;

  /**
   * The social platform this adapter handles.
   */
  readonly platform: SocialPlatform;
}
