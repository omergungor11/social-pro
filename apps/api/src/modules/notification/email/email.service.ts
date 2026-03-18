import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EMAIL_NOTIFICATION_QUEUE = "email-notification";

// ---------------------------------------------------------------------------
// Job data type
// ---------------------------------------------------------------------------

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue(EMAIL_NOTIFICATION_QUEUE)
    private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  /**
   * Enqueues an outbound email as a BullMQ job.
   * The actual SMTP delivery is handled by EmailProcessor.
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    const jobData: EmailJobData = { to, subject, html, ...(text ? { text } : {}) };

    await this.emailQueue.add("send", jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    });

    this.logger.debug(`Email job enqueued — to=${to} subject="${subject}"`);
  }
}
