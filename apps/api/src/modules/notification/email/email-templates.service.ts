import { Injectable } from "@nestjs/common";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface EmailTemplate {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Shared wrapper
// ---------------------------------------------------------------------------

function wrapEmail(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <div style="background:#1e293b;padding:24px 32px">
        <h1 style="color:#fff;font-size:18px;margin:0">Social Pro</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:#0f172a;font-size:20px;margin:0 0 16px">${title}</h2>
        ${body}
      </div>
      <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
        <p style="color:#94a3b8;font-size:12px;margin:0">Social Pro &mdash; Agency Social Media Management</p>
        <p style="margin:4px 0 0"><a href="{{unsubscribeUrl}}" style="color:#94a3b8;font-size:11px">Unsubscribe</a></p>
      </div>
    </div>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Reusable primitive fragments
// ---------------------------------------------------------------------------

function ctaButton(label: string, url: string): string {
  return `<a href="${url}"
    style="display:inline-block;margin-top:24px;padding:12px 28px;background:#1e293b;color:#fff;
           text-decoration:none;border-radius:8px;font-size:14px;font-weight:600"
  >${label}</a>`;
}

function mutedText(text: string): string {
  return `<p style="color:#64748b;font-size:13px;margin:16px 0 0">${text}</p>`;
}

function bodyText(text: string): string {
  return `<p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 8px">${text}</p>`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class EmailTemplatesService {
  /**
   * Team member invitation email.
   */
  invitation(params: {
    inviterName: string;
    agencyName: string;
    inviteUrl: string;
  }): EmailTemplate {
    const { inviterName, agencyName, inviteUrl } = params;

    const body = `
      ${bodyText(`<strong>${inviterName}</strong> has invited you to join <strong>${agencyName}</strong> on Social Pro.`)}
      ${bodyText("Click the button below to accept the invitation and set up your account.")}
      ${ctaButton("Accept Invitation", inviteUrl)}
      ${mutedText("This invitation link expires in 48 hours. If you did not expect this email, you can safely ignore it.")}
    `;

    return {
      subject: `You've been invited to join ${agencyName} on Social Pro`,
      html: wrapEmail("Team Invitation", body),
    };
  }

  /**
   * Password reset email.
   */
  passwordReset(params: { resetUrl: string; userName: string }): EmailTemplate {
    const { resetUrl, userName } = params;

    const body = `
      ${bodyText(`Hi <strong>${userName}</strong>,`)}
      ${bodyText("We received a request to reset your Social Pro password. Click the button below to choose a new password.")}
      ${ctaButton("Reset Password", resetUrl)}
      ${mutedText("This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email — your password has not changed.")}
    `;

    return {
      subject: "Reset your Social Pro password",
      html: wrapEmail("Password Reset", body),
    };
  }

  /**
   * Payment receipt / subscription confirmation.
   */
  paymentReceipt(params: {
    amount: string;
    planName: string;
    invoiceUrl: string;
  }): EmailTemplate {
    const { amount, planName, invoiceUrl } = params;

    const body = `
      ${bodyText("Thank you for your payment. Here is a summary of your transaction:")}
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px 0;color:#64748b;font-size:14px">Plan</td>
          <td style="padding:10px 0;color:#0f172a;font-size:14px;text-align:right;font-weight:600">${planName}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:14px">Amount charged</td>
          <td style="padding:10px 0;color:#0f172a;font-size:14px;text-align:right;font-weight:600">${amount}</td>
        </tr>
      </table>
      ${ctaButton("View Invoice", invoiceUrl)}
      ${mutedText("Keep this email for your records. For billing questions, contact support@socialpro.app.")}
    `;

    return {
      subject: `Payment receipt — ${planName} plan`,
      html: wrapEmail("Payment Receipt", body),
    };
  }

  /**
   * Post publishing failure notification.
   */
  postFailed(params: {
    postTitle: string;
    errorMessage: string;
    postUrl: string;
  }): EmailTemplate {
    const { postTitle, errorMessage, postUrl } = params;

    const body = `
      ${bodyText("We were unable to publish the following post:")}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
        <p style="color:#0f172a;font-size:14px;font-weight:600;margin:0 0 6px">${postTitle}</p>
        <p style="color:#dc2626;font-size:13px;margin:0">${errorMessage}</p>
      </div>
      ${bodyText("Please review the post and try publishing it again.")}
      ${ctaButton("View Post", postUrl)}
      ${mutedText("If this problem persists, contact our support team for assistance.")}
    `;

    return {
      subject: `Post publishing failed: ${postTitle}`,
      html: wrapEmail("Post Publishing Failed", body),
    };
  }

  /**
   * Social account disconnected notification.
   */
  accountDisconnected(params: {
    platform: string;
    accountName: string;
    reconnectUrl: string;
  }): EmailTemplate {
    const { platform, accountName, reconnectUrl } = params;

    const body = `
      ${bodyText(`Your <strong>${platform}</strong> account <strong>@${accountName}</strong> has been disconnected from Social Pro.`)}
      ${bodyText("This may have happened because your access token expired or was revoked. Scheduled posts for this account will not be published until you reconnect.")}
      ${ctaButton("Reconnect Account", reconnectUrl)}
      ${mutedText("If you intentionally removed this connection, you can disregard this message.")}
    `;

    return {
      subject: `${platform} account disconnected — action required`,
      html: wrapEmail(`${platform} Account Disconnected`, body),
    };
  }
}
