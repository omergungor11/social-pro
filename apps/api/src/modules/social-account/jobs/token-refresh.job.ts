import { Injectable, Logger } from "@nestjs/common";
import { SocialAccountService } from "../social-account.service";

export const TOKEN_REFRESH_QUEUE = "token-refresh";
export const TOKEN_REFRESH_JOB_NAME = "refresh-expiring-tokens";

/**
 * Job data payload for the token refresh job.
 * An empty object is used for the scheduled (cron) variant since the job
 * scans all expiring accounts itself. An optional accountId can be supplied
 * to refresh a single specific account.
 */
export interface TokenRefreshJobData {
  accountId?: string;
}

/**
 * Token refresh job processor.
 *
 * Scans for accounts whose tokens expire within the next 30 minutes and
 * refreshes them proactively. Accounts whose refresh fails are marked
 * inactive so the UI can prompt the user to reconnect.
 *
 * Idempotency: each account is only refreshed when it is still expiring
 * at the time the job runs — the DB query acts as a natural deduplication
 * gate. Concurrent job instances will race to update the same row, but the
 * last-writer-wins Prisma update is harmless (both produce a valid token).
 *
 * Usage with BullMQ (wire up in social-account-queue.module.ts):
 *
 *   @Processor(TOKEN_REFRESH_QUEUE)
 *   class TokenRefreshProcessor extends WorkerHost {
 *     async process(job: Job<TokenRefreshJobData>): Promise<void> {
 *       await this.tokenRefreshJob.run(job.data);
 *     }
 *   }
 *
 * Scheduled via BullMQ repeat: { pattern: '* /5 * * * *' } (every 5 minutes).
 */
@Injectable()
export class TokenRefreshJob {
  private readonly logger = new Logger(TokenRefreshJob.name);
  private readonly expiryWindowMinutes = 30;

  constructor(private readonly socialAccountService: SocialAccountService) {}

  /**
   * Main entry point. When `data.accountId` is provided, refreshes only that
   * account. Otherwise, scans and refreshes all accounts expiring within the
   * configured window.
   */
  async run(data: TokenRefreshJobData = {}): Promise<void> {
    if (data.accountId) {
      await this.refreshSingle(data.accountId);
      return;
    }

    await this.refreshExpiring();
  }

  // ---------------------------------------------------------------------------

  private async refreshExpiring(): Promise<void> {
    const accounts = await this.socialAccountService.findExpiringAccounts(
      this.expiryWindowMinutes
    );

    if (accounts.length === 0) {
      this.logger.debug("No expiring tokens found");
      return;
    }

    this.logger.log(
      `Found ${accounts.length} account(s) with tokens expiring within ${this.expiryWindowMinutes}m`
    );

    const results = await Promise.allSettled(
      accounts.map((account) => this.refreshSingle(account.id))
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;

    this.logger.log(
      `Token refresh batch complete: ${succeeded} succeeded, ${failed} failed`
    );
  }

  private async refreshSingle(accountId: string): Promise<void> {
    try {
      await this.socialAccountService.refreshAccountToken(accountId);
      this.logger.log(`Token refreshed successfully: accountId=${accountId}`);
    } catch (err) {
      // refreshAccountToken already marks the account inactive and logs the error
      this.logger.error(
        `Token refresh failed for accountId=${accountId}: ${String(err)}`
      );
      // Do not rethrow — allows allSettled to capture failures individually
    }
  }
}
