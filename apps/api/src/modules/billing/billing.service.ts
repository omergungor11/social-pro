import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Agency, Plan } from "@social-pro/prisma";
import Stripe from "stripe";
import { PrismaService } from "../common/prisma/prisma.service";
import { UsageTrackingService, AgencyUsage } from "./usage-tracking.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface PortalSession {
  url: string;
}

export interface SubscriptionDetails {
  agency: Pick<Agency, "id" | "stripeCustomerId" | "stripeSubscriptionId" | "planId">;
  plan: Plan | null;
  stripeSubscription: Stripe.Subscription | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  private readonly defaultSuccessUrl =
    process.env["BILLING_SUCCESS_URL"] ??
    "https://app.socialpro.io/billing?success=true";
  private readonly defaultCancelUrl =
    process.env["BILLING_CANCEL_URL"] ??
    "https://app.socialpro.io/billing?cancelled=true";

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTracking: UsageTrackingService
  ) {
    this.stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] || "sk_test_placeholder", {
      apiVersion: "2025-02-24.acacia",
    });
  }

  // ---------------------------------------------------------------------------
  // List plans
  // ---------------------------------------------------------------------------

  async listPlans(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Get subscription
  // ---------------------------------------------------------------------------

  async getSubscription(agencyId: string): Promise<SubscriptionDetails> {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: { plan: true },
    });

    if (!agency) {
      throw new NotFoundException(`Agency '${agencyId}' not found`);
    }

    let stripeSubscription: Stripe.Subscription | null = null;

    if (agency.stripeSubscriptionId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          agency.stripeSubscriptionId
        );
      } catch (err) {
        this.logger.warn(
          `Could not retrieve Stripe subscription ${agency.stripeSubscriptionId}: ${String(err)}`
        );
      }
    }

    return {
      agency: {
        id: agency.id,
        stripeCustomerId: agency.stripeCustomerId,
        stripeSubscriptionId: agency.stripeSubscriptionId,
        planId: agency.planId,
      },
      plan: agency.plan,
      stripeSubscription,
    };
  }

  // ---------------------------------------------------------------------------
  // Create checkout session
  // ---------------------------------------------------------------------------

  async createCheckoutSession(
    agencyId: string,
    planId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CheckoutSession> {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });

    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Plan '${planId}' not found or inactive`);
    }

    if (!plan.stripePriceId) {
      throw new BadRequestException(
        `Plan '${planId}' does not have a Stripe price configured`
      );
    }

    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency '${agencyId}' not found`);
    }

    // Ensure a Stripe customer exists for this agency
    const customerId = await this.ensureStripeCustomer(agency);

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl ?? this.defaultSuccessUrl,
      cancel_url: cancelUrl ?? this.defaultCancelUrl,
      metadata: { agencyId, planId },
      subscription_data: { metadata: { agencyId, planId } },
    });

    this.logger.log(
      `Stripe checkout session created: agencyId=${agencyId} planId=${planId} sessionId=${session.id}`
    );

    return { url: session.url ?? "", sessionId: session.id };
  }

  // ---------------------------------------------------------------------------
  // Change plan
  // ---------------------------------------------------------------------------

  async changePlan(agencyId: string, newPlanId: string): Promise<SubscriptionDetails> {
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.isActive) {
      throw new NotFoundException(`Plan '${newPlanId}' not found or inactive`);
    }

    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency '${agencyId}' not found`);
    }

    if (!agency.stripeSubscriptionId) {
      throw new BadRequestException(
        "Agency has no active Stripe subscription. Use /billing/subscribe to create one."
      );
    }

    if (!newPlan.stripePriceId) {
      throw new BadRequestException(
        `Plan '${newPlanId}' does not have a Stripe price configured`
      );
    }

    // Retrieve current subscription items
    const subscription = await this.stripe.subscriptions.retrieve(
      agency.stripeSubscriptionId
    );
    const itemId = subscription.items.data[0]?.id;

    if (!itemId) {
      throw new BadRequestException("Stripe subscription has no items");
    }

    // Upgrade/downgrade: update the subscription price
    await this.stripe.subscriptions.update(agency.stripeSubscriptionId, {
      items: [{ id: itemId, price: newPlan.stripePriceId }],
      proration_behavior: "create_prorations",
      metadata: { agencyId, planId: newPlanId },
    });

    // Update local plan reference immediately
    await this.prisma.agency.update({
      where: { id: agencyId },
      data: { planId: newPlanId },
    });

    this.logger.log(
      `Plan changed: agencyId=${agencyId} newPlanId=${newPlanId}`
    );

    return this.getSubscription(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Cancel subscription
  // ---------------------------------------------------------------------------

  async cancelSubscription(agencyId: string): Promise<SubscriptionDetails> {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency '${agencyId}' not found`);
    }

    if (!agency.stripeSubscriptionId) {
      throw new BadRequestException(
        "Agency has no active subscription to cancel"
      );
    }

    // Cancel at period end (not immediately) so the customer retains access
    await this.stripe.subscriptions.update(agency.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    this.logger.log(
      `Subscription set to cancel at period end: agencyId=${agencyId} subscriptionId=${agency.stripeSubscriptionId}`
    );

    return this.getSubscription(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Customer portal
  // ---------------------------------------------------------------------------

  async getPortalUrl(agencyId: string): Promise<PortalSession> {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency '${agencyId}' not found`);
    }

    const customerId = await this.ensureStripeCustomer(agency);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url:
        process.env["BILLING_PORTAL_RETURN_URL"] ??
        "https://app.socialpro.io/billing",
    });

    this.logger.log(
      `Billing portal session created: agencyId=${agencyId} customerId=${customerId}`
    );

    return { url: session.url };
  }

  // ---------------------------------------------------------------------------
  // Get usage
  // ---------------------------------------------------------------------------

  async getUsage(agencyId: string): Promise<AgencyUsage> {
    return this.usageTracking.getUsage(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async ensureStripeCustomer(agency: Agency): Promise<string> {
    if (agency.stripeCustomerId) {
      return agency.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      name: agency.name,
      metadata: { agencyId: agency.id, slug: agency.slug },
    });

    await this.prisma.agency.update({
      where: { id: agency.id },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(
      `Stripe customer created: agencyId=${agency.id} customerId=${customer.id}`
    );

    return customer.id;
  }
}
