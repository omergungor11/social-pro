import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { BillingController } from "./billing.controller";
import { WebhookController } from "./webhook.controller";
import { BillingService } from "./billing.service";
import { StripeWebhookService } from "./stripe-webhook.service";
import { UsageTrackingService } from "./usage-tracking.service";
import { PlanLimitGuard } from "./guards/plan-limit.guard";

/**
 * Billing module.
 *
 * Provides:
 *  - BillingService: Stripe checkout, subscription management, plan changes
 *  - StripeWebhookService: webhook signature verification + event processing
 *  - UsageTrackingService: per-agency usage recording and limit checking
 *  - PlanLimitGuard: injectable guard for enforcing plan limits on routes
 *
 * Environment variables required:
 *  - STRIPE_SECRET_KEY       — Stripe secret API key
 *  - STRIPE_WEBHOOK_SECRET   — Stripe webhook endpoint signing secret
 *  - BILLING_SUCCESS_URL     — (optional) post-checkout success redirect URL
 *  - BILLING_CANCEL_URL      — (optional) post-checkout cancel redirect URL
 *  - BILLING_PORTAL_RETURN_URL — (optional) portal return URL
 *
 * The WebhookController is registered here and is NOT protected by AuthGuard.
 * Authentication for /webhooks/stripe is handled via Stripe signature verification.
 */
@Module({
  imports: [PrismaModule],
  controllers: [BillingController, WebhookController],
  providers: [
    BillingService,
    StripeWebhookService,
    UsageTrackingService,
    PlanLimitGuard,
  ],
  exports: [BillingService, UsageTrackingService, PlanLimitGuard],
})
export class BillingModule {}
