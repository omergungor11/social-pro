import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { BillingService } from "./billing.service";
import { SubscribeDto } from "./dto/subscribe.dto";
import { ChangePlanDto } from "./dto/change-plan.dto";

@ApiTags("Billing")
@ApiBearerAuth()
@Controller("billing")
@UseGuards(RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ---------------------------------------------------------------------------
  // Plans
  // ---------------------------------------------------------------------------

  @Get("plans")
  @ApiOperation({
    summary: "List available plans",
    description: "Returns all active subscription plans ordered by price ascending.",
  })
  @ApiResponse({ status: 200, description: "Plans retrieved" })
  async listPlans() {
    return this.billingService.listPlans();
  }

  // ---------------------------------------------------------------------------
  // Subscription
  // ---------------------------------------------------------------------------

  @Get("subscription")
  @ApiOperation({
    summary: "Get current subscription",
    description:
      "Returns the agency's current plan, Stripe subscription details, " +
      "and Stripe customer ID.",
  })
  @ApiResponse({ status: 200, description: "Subscription details retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Agency not found" })
  async getSubscription(@CurrentAgency() agencyId: string) {
    return this.billingService.getSubscription(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Subscribe (create checkout session)
  // ---------------------------------------------------------------------------

  @Post("subscribe")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a Stripe checkout session",
    description:
      "Creates a Stripe Checkout session for the specified plan. " +
      "Returns a redirect URL to the Stripe-hosted checkout page.",
  })
  @ApiResponse({ status: 201, description: "Checkout session created" })
  @ApiResponse({ status: 400, description: "Plan has no Stripe price configured" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Plan not found" })
  async subscribe(
    @CurrentAgency() agencyId: string,
    @Body() dto: SubscribeDto
  ) {
    return this.billingService.createCheckoutSession(
      agencyId,
      dto.planId,
      dto.successUrl,
      dto.cancelUrl
    );
  }

  // ---------------------------------------------------------------------------
  // Change plan
  // ---------------------------------------------------------------------------

  @Post("change-plan")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Upgrade or downgrade subscription plan",
    description:
      "Switches the agency's active Stripe subscription to a new plan " +
      "with proration. The agency must already have an active subscription.",
  })
  @ApiResponse({ status: 200, description: "Plan changed" })
  @ApiResponse({ status: 400, description: "No active subscription" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Plan not found" })
  async changePlan(
    @CurrentAgency() agencyId: string,
    @Body() dto: ChangePlanDto
  ) {
    return this.billingService.changePlan(agencyId, dto.newPlanId);
  }

  // ---------------------------------------------------------------------------
  // Cancel subscription
  // ---------------------------------------------------------------------------

  @Post("cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel subscription at period end",
    description:
      "Sets cancel_at_period_end=true on the Stripe subscription. " +
      "The agency retains access until the current billing period expires.",
  })
  @ApiResponse({ status: 200, description: "Subscription scheduled for cancellation" })
  @ApiResponse({ status: 400, description: "No active subscription" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async cancelSubscription(@CurrentAgency() agencyId: string) {
    return this.billingService.cancelSubscription(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Customer portal
  // ---------------------------------------------------------------------------

  @Post("portal")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get Stripe billing portal URL",
    description:
      "Creates a Stripe Billing Portal session and returns the URL. " +
      "The customer can manage payment methods, invoices, and subscriptions there.",
  })
  @ApiResponse({ status: 200, description: "Portal URL returned" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getPortalUrl(@CurrentAgency() agencyId: string) {
    return this.billingService.getPortalUrl(agencyId);
  }

  // ---------------------------------------------------------------------------
  // Usage
  // ---------------------------------------------------------------------------

  @Get("usage")
  @ApiOperation({
    summary: "Get current usage vs plan limits",
    description:
      "Returns all UsageMetric values for the current billing period " +
      "alongside the plan limits and whether each metric is within limit.",
  })
  @ApiResponse({ status: 200, description: "Usage retrieved" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async getUsage(@CurrentAgency() agencyId: string) {
    return this.billingService.getUsage(agencyId);
  }
}
