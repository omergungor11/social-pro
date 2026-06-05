import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import type {
  FetchedInboxItem,
  InboxAccount,
  PlatformInboxAdapter,
  ReplyResult,
} from "./inbox-adapter.interface";

/**
 * LinkedIn inbox adapter.
 *
 * LinkedIn's comments (socialActions) and messaging APIs require
 * partnership-level access — the Community Management API / Marketing
 * Developer Platform partner tier — that standard apps don't have. We
 * therefore implement this honestly: `fetchItems` returns nothing and
 * `reply` throws a clear, user-facing error. The structure below is ready
 * for the real socialActions calls to be slotted in once partner access is
 * granted.
 */
@Injectable()
export class LinkedInInboxAdapter implements PlatformInboxAdapter {
  readonly platform = SocialPlatform.LINKEDIN;
  readonly canReply = false;

  private readonly logger = new Logger(LinkedInInboxAdapter.name);
  private readonly apiBase = "https://api.linkedin.com";
  private readonly apiVersion = "202401";

  async fetchItems(_account: InboxAccount): Promise<FetchedInboxItem[]> {
    this.logger.debug(
      "LinkedIn comment ingestion is disabled: it requires the LinkedIn " +
        "Community Management API / partner access. Returning no items.",
    );
    return [];
  }

  async reply(
    _parentPlatformId: string,
    _text: string,
    _account: InboxAccount,
    _context: { type: string; platformPostId?: string | null },
  ): Promise<ReplyResult> {
    throw new Error(
      "Replying on LinkedIn is not available — it requires LinkedIn Community Management API partner access.",
    );
  }

  /**
   * Intended (not yet callable) ingestion of comments on a given share.
   *
   * Once partner access is granted this would issue:
   *   GET https://api.linkedin.com/v2/socialActions/{shareUrn}/comments
   * with headers:
   *   Authorization: Bearer {account.accessToken}
   *   LinkedIn-Version: {this.apiVersion}
   *   X-Restli-Protocol-Version: 2.0.0
   * mapping each returned comment into a FetchedInboxItem of type "COMMENT".
   *
   * Deliberately unused for now — standard apps cannot read socialActions.
   */
  private async fetchCommentsForShare(
    _shareUrn: string,
    _account: InboxAccount,
  ): Promise<FetchedInboxItem[]> {
    void this.apiBase;
    void this.apiVersion;
    return [];
  }
}
