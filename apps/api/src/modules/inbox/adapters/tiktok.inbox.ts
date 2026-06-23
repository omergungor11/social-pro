import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatform } from "@social-pro/prisma";
import type {
  FetchedInboxItem,
  InboxAccount,
  PlatformInboxAdapter,
  ReplyResult,
} from "./inbox-adapter.interface";

/**
 * TikTok inbox adapter.
 *
 * TikTok offers no public comments-read or direct-message API to third-party
 * apps — there is no way to ingest comments/DMs or post replies on a user's
 * behalf. We therefore implement this honestly (like LinkedIn): `fetchItems`
 * returns nothing and `reply` throws a clear, user-facing error.
 */
@Injectable()
export class TikTokInboxAdapter implements PlatformInboxAdapter {
  readonly platform = SocialPlatform.TIKTOK;
  readonly canReply = false;
  readonly canDelete = false;

  private readonly logger = new Logger(TikTokInboxAdapter.name);

  async fetchItems(_account: InboxAccount): Promise<FetchedInboxItem[]> {
    this.logger.debug(
      "TikTok comment/DM ingestion is disabled: TikTok offers no public " +
        "comment or message API for third-party apps. Returning no items.",
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
      "Replying on TikTok is not available — TikTok has no public comment/message API for third-party apps.",
    );
  }
}
