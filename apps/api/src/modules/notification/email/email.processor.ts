import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { EMAIL_NOTIFICATION_QUEUE, EmailJobData } from "./email.service";

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

@Processor(EMAIL_NOTIFICATION_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor() {
    super();

    const host = process.env["SMTP_HOST"] ?? "localhost";
    const port = parseInt(process.env["SMTP_PORT"] ?? "1025", 10);
    const user = process.env["SMTP_USER"];
    const pass = process.env["SMTP_PASS"];
    this.from = process.env["SMTP_FROM"] ?? "noreply@socialpro.app";

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass
        ? { auth: { user, pass } }
        : {}),
    });
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, html, text } = job.data;

    this.logger.log(
      `Processing email job id=${job.id} attempt=${job.attemptsMade + 1} — to=${to}`,
    );

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
      });

      this.logger.log(
        `Email delivered — messageId=${String(info.messageId)} to=${to}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Email delivery failed — job id=${job.id} to=${to} error="${message}"`,
      );
      // Re-throw so BullMQ can retry per the job's backoff policy.
      throw err;
    }
  }
}
