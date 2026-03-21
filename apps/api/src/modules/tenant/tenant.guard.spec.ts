import { describe, it, expect, beforeEach, vi } from "vitest";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { TenantGuard } from "./tenant.guard";
import { TenantService, type AgencyWithPlan } from "./tenant.service";
import type { AuthenticatedUser } from "../common/decorators/current-user.decorator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AGENCY_ID = "agency-uuid-1";
const USER_ID = "user-uuid-1";

const mockAgency: AgencyWithPlan = {
  id: AGENCY_ID,
  name: "Test Agency",
  slug: "test-agency",
  logoUrl: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  planId: null,
  plan: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

function buildAuthenticatedUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: USER_ID,
    email: "owner@agency.com",
    name: "Test Owner",
    agencyId: AGENCY_ID,
    role: "OWNER",
    ...overrides,
  };
}

/**
 * Creates a minimal ExecutionContext mock. `isPublic` controls the @Public()
 * metadata, `user` is attached to the mock request.
 */
function buildExecutionContext(options: {
  isPublic?: boolean;
  user?: AuthenticatedUser | null;
}): ExecutionContext {
  const request = {
    user: options.user ?? null,
    agency: undefined as AgencyWithPlan | undefined,
  };

  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue(request),
    }),
    __request: request, // expose for assertions
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("TenantGuard", () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let tenantService: TenantService;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;

    tenantService = {
      validateMembership: vi.fn().mockResolvedValue("OWNER"),
      getAgency: vi.fn().mockResolvedValue(mockAgency),
    } as unknown as TenantService;

    guard = new TenantGuard(reflector, tenantService);
  });

  // -------------------------------------------------------------------------
  // Public routes
  // -------------------------------------------------------------------------

  describe("@Public() routes", () => {
    it("returns true without any validation when the route is marked public", async () => {
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
      const ctx = buildExecutionContext({ user: null });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(tenantService.validateMembership).not.toHaveBeenCalled();
      expect(tenantService.getAgency).not.toHaveBeenCalled();
    });

    it("checks the correct metadata key", async () => {
      vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
      const ctx = buildExecutionContext({ user: null });

      await guard.canActivate(ctx);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.any(Array)
      );
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated requests
  // -------------------------------------------------------------------------

  describe("authenticated requests", () => {
    it("allows access and attaches the agency to the request when user + membership are valid", async () => {
      const user = buildAuthenticatedUser();
      const ctx = buildExecutionContext({ user });
      const rawCtx = ctx as unknown as { __request: { agency: AgencyWithPlan } };

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(tenantService.validateMembership).toHaveBeenCalledWith(USER_ID, AGENCY_ID);
      expect(tenantService.getAgency).toHaveBeenCalledWith(AGENCY_ID);
      expect(rawCtx.__request.agency).toEqual(mockAgency);
    });

    it("calls validateMembership with the user id and agencyId from request.user", async () => {
      const user = buildAuthenticatedUser({ id: "other-user", agencyId: "other-agency" });
      const ctx = buildExecutionContext({ user });

      await guard.canActivate(ctx);

      expect(tenantService.validateMembership).toHaveBeenCalledWith(
        "other-user",
        "other-agency"
      );
    });
  });

  // -------------------------------------------------------------------------
  // Missing user / agencyId
  // -------------------------------------------------------------------------

  describe("missing user context", () => {
    it("throws UnauthorizedException when request.user is undefined", async () => {
      const ctx = buildExecutionContext({ user: null });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user.id is missing", async () => {
      const user = { id: "", email: "x@x.com", name: "X", agencyId: AGENCY_ID, role: "OWNER" };
      const ctx = buildExecutionContext({ user });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user.agencyId is missing", async () => {
      const user = { id: USER_ID, email: "x@x.com", name: "X", agencyId: "", role: "OWNER" };
      const ctx = buildExecutionContext({ user });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // Membership validation failure
  // -------------------------------------------------------------------------

  describe("membership validation failure", () => {
    it("propagates UnauthorizedException from tenantService.validateMembership", async () => {
      const user = buildAuthenticatedUser();
      const ctx = buildExecutionContext({ user });

      vi.mocked(tenantService.validateMembership).mockRejectedValue(
        new UnauthorizedException("User is not a member of this agency")
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it("does not call getAgency when validateMembership throws", async () => {
      const user = buildAuthenticatedUser();
      const ctx = buildExecutionContext({ user });

      vi.mocked(tenantService.validateMembership).mockRejectedValue(
        new UnauthorizedException()
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow();
      expect(tenantService.getAgency).not.toHaveBeenCalled();
    });
  });
});
