import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import type Stripe from "stripe";
import { BillingService } from "./billing.service";
import { UsageTrackingService } from "./usage-tracking.service";
import { createPrismaMock, resetPrismaMock, type MockPrismaService } from "../../test/prisma-mock";

// ---------------------------------------------------------------------------
// Stripe mock factory
// ---------------------------------------------------------------------------
//
// We instantiate BillingService directly, then replace its private `stripe`
// field with a controlled mock via Object.defineProperty so that no real
// Stripe client is ever created.

type StripeMock = {
  customers: {
    create: ReturnType<typeof vi.fn>;
    retrieve: ReturnType<typeof vi.fn>;
  };
  subscriptions: {
    retrieve: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  checkout: {
    sessions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  billingPortal: {
    sessions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
};

function createStripeMock(): StripeMock {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_test123" }),
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: "sub_test123",
        status: "active",
        items: { data: [{ id: "si_test123", price: { id: "price_test123" } }] },
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      } as unknown as Stripe.Subscription),
      update: vi.fn().mockResolvedValue({ id: "sub_test123", cancel_at_period_end: false }),
      cancel: vi.fn().mockResolvedValue({ id: "sub_test123", status: "canceled" }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: "cs_test123", url: "https://checkout.stripe.com/test" }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/test" }),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGENCY_ID = "agency-uuid-1";
const PLAN_ID = "plan-uuid-1";
const NEW_PLAN_ID = "plan-uuid-2";

const mockAgency = {
  id: AGENCY_ID,
  name: "Test Agency",
  slug: "test-agency",
  logoUrl: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  planId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockAgencyWithStripe = {
  ...mockAgency,
  stripeCustomerId: "cus_test123",
  stripeSubscriptionId: "sub_test123",
  planId: PLAN_ID,
};

const mockPlan = {
  id: PLAN_ID,
  name: "Pro",
  slug: "pro",
  priceCents: 4900,
  stripePriceId: "price_pro123",
  isActive: true,
  maxSocialAccounts: 10,
  maxClients: 50,
  maxTeamMembers: 5,
  maxScheduledPostsPerMonth: 500,
  aiCreditsPerMonth: 100,
  storageLimitGb: 10,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockNewPlan = {
  ...mockPlan,
  id: NEW_PLAN_ID,
  name: "Business",
  priceCents: 9900,
  stripePriceId: "price_business123",
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("BillingService", () => {
  let service: BillingService;
  let prisma: MockPrismaService;
  let usageTracking: UsageTrackingService;
  let stripeMock: StripeMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    usageTracking = {
      getUsage: vi.fn().mockResolvedValue({
        agencyId: AGENCY_ID,
        periodStart: new Date(),
        periodEnd: new Date(),
        metrics: [],
      }),
    } as unknown as UsageTrackingService;

    service = new BillingService(prisma as never, usageTracking);

    // Inject the mock Stripe client
    stripeMock = createStripeMock();
    Object.defineProperty(service, "stripe", { value: stripeMock, writable: true });
  });

  afterEach(() => {
    resetPrismaMock(prisma);
  });

  // -------------------------------------------------------------------------
  // listPlans
  // -------------------------------------------------------------------------

  describe("listPlans", () => {
    it("returns active plans ordered by price ascending", async () => {
      prisma.plan.findMany.mockResolvedValue([mockPlan]);

      const result = await service.listPlans();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(PLAN_ID);
      expect(prisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { priceCents: "asc" },
        })
      );
    });

    it("returns an empty array when no active plans exist", async () => {
      prisma.plan.findMany.mockResolvedValue([]);
      const result = await service.listPlans();
      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getSubscription
  // -------------------------------------------------------------------------

  describe("getSubscription", () => {
    it("returns agency, plan, and Stripe subscription details", async () => {
      prisma.agency.findUnique.mockResolvedValue({ ...mockAgencyWithStripe, plan: mockPlan });

      const result = await service.getSubscription(AGENCY_ID);

      expect(result.agency.id).toBe(AGENCY_ID);
      expect(result.plan?.id).toBe(PLAN_ID);
      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_test123");
    });

    it("returns null stripeSubscription when agency has no subscription id", async () => {
      prisma.agency.findUnique.mockResolvedValue({ ...mockAgency, plan: null });

      const result = await service.getSubscription(AGENCY_ID);

      expect(result.stripeSubscription).toBeNull();
      expect(stripeMock.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it("returns null stripeSubscription when Stripe retrieval fails", async () => {
      prisma.agency.findUnique.mockResolvedValue({ ...mockAgencyWithStripe, plan: mockPlan });
      stripeMock.subscriptions.retrieve.mockRejectedValue(new Error("Stripe error"));

      const result = await service.getSubscription(AGENCY_ID);

      // Service catches the error and returns null gracefully
      expect(result.stripeSubscription).toBeNull();
    });

    it("throws NotFoundException when agency does not exist", async () => {
      prisma.agency.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription("non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // createCheckoutSession
  // -------------------------------------------------------------------------

  describe("createCheckoutSession", () => {
    it("creates a Stripe checkout session and returns url + sessionId", async () => {
      prisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.agency.findUnique.mockResolvedValue(mockAgencyWithStripe);

      const result = await service.createCheckoutSession(AGENCY_ID, PLAN_ID);

      expect(result.url).toBe("https://checkout.stripe.com/test");
      expect(result.sessionId).toBe("cs_test123");
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          customer: "cus_test123",
          line_items: [{ price: mockPlan.stripePriceId, quantity: 1 }],
        })
      );
    });

    it("creates a new Stripe customer when agency has no customerId", async () => {
      prisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.agency.findUnique.mockResolvedValue(mockAgency);
      prisma.agency.update.mockResolvedValue({ ...mockAgency, stripeCustomerId: "cus_test123" });

      await service.createCheckoutSession(AGENCY_ID, PLAN_ID);

      expect(stripeMock.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: mockAgency.name })
      );
      expect(prisma.agency.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stripeCustomerId: "cus_test123" }),
        })
      );
    });

    it("throws NotFoundException when plan does not exist", async () => {
      prisma.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(AGENCY_ID, "non-existent-plan")
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when plan is inactive", async () => {
      prisma.plan.findUnique.mockResolvedValue({ ...mockPlan, isActive: false });

      await expect(
        service.createCheckoutSession(AGENCY_ID, PLAN_ID)
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when plan has no Stripe price configured", async () => {
      prisma.plan.findUnique.mockResolvedValue({ ...mockPlan, stripePriceId: null });
      prisma.agency.findUnique.mockResolvedValue(mockAgencyWithStripe);

      await expect(
        service.createCheckoutSession(AGENCY_ID, PLAN_ID)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // changePlan
  // -------------------------------------------------------------------------

  describe("changePlan", () => {
    it("upgrades to a new plan and updates the agency record", async () => {
      prisma.plan.findUnique.mockResolvedValue(mockNewPlan);
      prisma.agency.findUnique
        .mockResolvedValueOnce(mockAgencyWithStripe)
        // getSubscription call at the end
        .mockResolvedValueOnce({ ...mockAgencyWithStripe, planId: NEW_PLAN_ID, plan: mockNewPlan });
      prisma.agency.update.mockResolvedValue({ ...mockAgencyWithStripe, planId: NEW_PLAN_ID });

      await service.changePlan(AGENCY_ID, NEW_PLAN_ID);

      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(
        "sub_test123",
        expect.objectContaining({
          items: [{ id: "si_test123", price: mockNewPlan.stripePriceId }],
          proration_behavior: "create_prorations",
        })
      );
      expect(prisma.agency.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ planId: NEW_PLAN_ID }),
        })
      );
    });

    it("throws NotFoundException when new plan does not exist", async () => {
      prisma.plan.findUnique.mockResolvedValue(null);

      await expect(service.changePlan(AGENCY_ID, "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws BadRequestException when agency has no active subscription", async () => {
      prisma.plan.findUnique.mockResolvedValue(mockNewPlan);
      prisma.agency.findUnique.mockResolvedValue({ ...mockAgency, stripeSubscriptionId: null });

      await expect(service.changePlan(AGENCY_ID, NEW_PLAN_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it("throws BadRequestException when new plan has no Stripe price", async () => {
      prisma.plan.findUnique.mockResolvedValue({ ...mockNewPlan, stripePriceId: null });
      prisma.agency.findUnique.mockResolvedValue(mockAgencyWithStripe);

      await expect(service.changePlan(AGENCY_ID, NEW_PLAN_ID)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // -------------------------------------------------------------------------
  // cancelSubscription
  // -------------------------------------------------------------------------

  describe("cancelSubscription", () => {
    it("sets subscription to cancel at period end", async () => {
      prisma.agency.findUnique
        .mockResolvedValueOnce(mockAgencyWithStripe)
        // getSubscription at the end
        .mockResolvedValueOnce({ ...mockAgencyWithStripe, plan: mockPlan });

      await service.cancelSubscription(AGENCY_ID);

      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(
        "sub_test123",
        { cancel_at_period_end: true }
      );
    });

    it("throws NotFoundException when agency does not exist", async () => {
      prisma.agency.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws BadRequestException when agency has no subscription", async () => {
      prisma.agency.findUnique.mockResolvedValue({
        ...mockAgency,
        stripeSubscriptionId: null,
      });

      await expect(service.cancelSubscription(AGENCY_ID)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // -------------------------------------------------------------------------
  // getPortalUrl
  // -------------------------------------------------------------------------

  describe("getPortalUrl", () => {
    it("returns the billing portal URL for the agency customer", async () => {
      prisma.agency.findUnique.mockResolvedValue(mockAgencyWithStripe);

      const result = await service.getPortalUrl(AGENCY_ID);

      expect(result.url).toBe("https://billing.stripe.com/session/test");
      expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_test123" })
      );
    });

    it("throws NotFoundException when agency does not exist", async () => {
      prisma.agency.findUnique.mockResolvedValue(null);

      await expect(service.getPortalUrl("non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // getUsage
  // -------------------------------------------------------------------------

  describe("getUsage", () => {
    it("delegates to UsageTrackingService and returns the result", async () => {
      const usage = {
        agencyId: AGENCY_ID,
        periodStart: new Date(),
        periodEnd: new Date(),
        metrics: [],
      };
      vi.mocked(usageTracking.getUsage).mockResolvedValue(usage);

      const result = await service.getUsage(AGENCY_ID);

      expect(result).toEqual(usage);
      expect(usageTracking.getUsage).toHaveBeenCalledWith(AGENCY_ID);
    });
  });
});
