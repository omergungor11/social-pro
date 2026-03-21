import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../common/prisma/prisma.service";

// ---------------------------------------------------------------------------
// Handled Stripe event types
// ---------------------------------------------------------------------------

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] || "sk_test_placeholder", {
      apiVersion: "2025-02-24.acacia",
    });
    this.webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
  }

  // ---------------------------------------------------------------------------
  // Main entry point
  // ---------------------------------------------------------------------------

  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<{ received: boolean }> {
    // Verify signature
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException("Invalid Stripe webhook signature");
    }

    // Deduplicate: skip if we already processed this event
    const already = await this.prisma.billingEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (already) {
      this.logger.debug(`Stripe event already processed: ${event.id}`);
      return { received: true };
    }

    if (!HANDLED_EVENTS.has(event.type)) {
      this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
      return { received: true };
    }

    this.logger.log(`Processing Stripe event: type=${event.type} id=${event.id}`);

    try {
      await this.dispatch(event);
    } catch (err) {
      this.logger.error(
        `Failed to process Stripe event ${event.id}: ${String(err)}`
      );
      // Re-throw so Stripe retries the webhook
      throw err;
    }

    return { received: true };
  }

  // ---------------------------------------------------------------------------
  // Event dispatcher
  // ---------------------------------------------------------------------------

  private async dispatch(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await this.onCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          event
        );
        break;

      case "invoice.paid":
        await this.onInvoicePaid(event.data.object as Stripe.Invoice, event);
        break;

      case "invoice.payment_failed":
        await this.onInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          event
        );
        break;

      case "customer.subscription.updated":
        await this.onSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          event
        );
        break;

      case "customer.subscription.deleted":
        await this.onSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          event
        );
        break;

      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // checkout.session.completed
  // ---------------------------------------------------------------------------

  private async onCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    event: Stripe.Event
  ): Promise<void> {
    const agencyId = session.metadata?.["agencyId"];
    const planId = session.metadata?.["planId"];
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!agencyId || !planId) {
      this.logger.warn(
        `checkout.session.completed missing metadata: sessionId=${session.id}`
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.agency.update({
        where: { id: agencyId },
        data: {
          planId,
          stripeSubscriptionId: subscriptionId ?? null,
        },
      }),
      this.prisma.billingEvent.create({
        data: {
          agencyId,
          stripeEventId: event.id,
          eventType: event.type,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          metadata: { sessionId: session.id, planId, subscriptionId },
        },
      }),
    ]);

    this.logger.log(
      `Checkout completed: agencyId=${agencyId} planId=${planId} subscriptionId=${subscriptionId}`
    );
  }

  // ---------------------------------------------------------------------------
  // invoice.paid
  // ---------------------------------------------------------------------------

  private async onInvoicePaid(
    invoice: Stripe.Invoice,
    event: Stripe.Event
  ): Promise<void> {
    const agencyId = await this.agencyIdFromCustomer(
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
    );

    if (!agencyId) return;

    await this.prisma.billingEvent.create({
      data: {
        agencyId,
        stripeEventId: event.id,
        eventType: event.type,
        amountCents: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? "usd",
        metadata: { invoiceId: invoice.id, status: invoice.status },
      },
    });

    this.logger.log(
      `Invoice paid: agencyId=${agencyId} invoiceId=${invoice.id} amount=${invoice.amount_paid}`
    );
  }

  // ---------------------------------------------------------------------------
  // invoice.payment_failed
  // ---------------------------------------------------------------------------

  private async onInvoicePaymentFailed(
    invoice: Stripe.Invoice,
    event: Stripe.Event
  ): Promise<void> {
    const agencyId = await this.agencyIdFromCustomer(
      typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
    );

    if (!agencyId) return;

    await this.prisma.billingEvent.create({
      data: {
        agencyId,
        stripeEventId: event.id,
        eventType: event.type,
        amountCents: invoice.amount_due ?? 0,
        currency: invoice.currency ?? "usd",
        metadata: {
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt,
        },
      },
    });

    this.logger.warn(
      `Invoice payment failed: agencyId=${agencyId} invoiceId=${invoice.id} attempts=${invoice.attempt_count}`
    );
  }

  // ---------------------------------------------------------------------------
  // customer.subscription.updated
  // ---------------------------------------------------------------------------

  private async onSubscriptionUpdated(
    subscription: Stripe.Subscription,
    event: Stripe.Event
  ): Promise<void> {
    const agencyId = await this.agencyIdFromCustomer(
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id
    );

    if (!agencyId) return;

    // Derive the plan from the Stripe price metadata if present
    const priceId = subscription.items.data[0]?.price.id;
    let planId: string | null = null;

    if (priceId) {
      const plan = await this.prisma.plan.findFirst({
        where: { stripePriceId: priceId },
      });
      planId = plan?.id ?? null;
    }

    await this.prisma.$transaction([
      this.prisma.agency.update({
        where: { id: agencyId },
        data: {
          stripeSubscriptionId: subscription.id,
          ...(planId != null && { planId }),
        },
      }),
      this.prisma.billingEvent.create({
        data: {
          agencyId,
          stripeEventId: event.id,
          eventType: event.type,
          metadata: {
            subscriptionId: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        },
      }),
    ]);

    this.logger.log(
      `Subscription updated: agencyId=${agencyId} subscriptionId=${subscription.id} status=${subscription.status}`
    );
  }

  // ---------------------------------------------------------------------------
  // customer.subscription.deleted
  // ---------------------------------------------------------------------------

  private async onSubscriptionDeleted(
    subscription: Stripe.Subscription,
    event: Stripe.Event
  ): Promise<void> {
    const agencyId = await this.agencyIdFromCustomer(
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id
    );

    if (!agencyId) return;

    await this.prisma.$transaction([
      this.prisma.agency.update({
        where: { id: agencyId },
        data: { stripeSubscriptionId: null, planId: null },
      }),
      this.prisma.billingEvent.create({
        data: {
          agencyId,
          stripeEventId: event.id,
          eventType: event.type,
          metadata: { subscriptionId: subscription.id },
        },
      }),
    ]);

    this.logger.log(
      `Subscription deleted: agencyId=${agencyId} subscriptionId=${subscription.id}`
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async agencyIdFromCustomer(
    customerId: string | null | undefined
  ): Promise<string | null> {
    if (!customerId) return null;

    const agency = await this.prisma.agency.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });

    if (!agency) {
      this.logger.warn(
        `No agency found for Stripe customerId=${customerId}`
      );
    }

    return agency?.id ?? null;
  }
}
