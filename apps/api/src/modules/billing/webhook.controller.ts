import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { StripeWebhookService } from "./stripe-webhook.service";

/**
 * Stripe webhook receiver.
 *
 * This endpoint is intentionally NOT protected by the AuthGuard because
 * Stripe sends unauthenticated POST requests. Authenticity is verified via
 * the Stripe-Signature header using the STRIPE_WEBHOOK_SECRET env variable.
 *
 * IMPORTANT: the route must receive the raw request body for signature
 * verification to succeed. Ensure NestJS is configured with
 * `rawBody: true` in the bootstrap (main.ts) and that this path is excluded
 * from the global JSON body parser.
 */
@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Stripe webhook endpoint",
    description:
      "Receives and processes Stripe webhook events. " +
      "Signature is verified using the STRIPE_WEBHOOK_SECRET environment variable. " +
      "Requires raw body — do not apply JSON body parsing to this route.",
  })
  @ApiResponse({ status: 200, description: "Webhook received" })
  @ApiResponse({ status: 400, description: "Invalid signature or malformed payload" })
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string
  ) {
    const rawBody = request.rawBody;

    if (!rawBody) {
      throw new BadRequestException(
        "Raw body is required for Stripe webhook signature verification. " +
          "Ensure rawBody: true is set in NestJS bootstrap."
      );
    }

    if (!signature) {
      throw new BadRequestException("Missing Stripe-Signature header");
    }

    return this.stripeWebhookService.handleWebhook(rawBody, signature);
  }
}
