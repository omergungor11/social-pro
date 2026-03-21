import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserRole } from "@social-pro/shared-types";
import { AuthService } from "./auth.service";
import { createPrismaMock, type MockPrismaService } from "../../test/prisma-mock";

// bcrypt is a CJS native module; in ESM vitest cannot spy on its exports
// directly via vi.spyOn. We verify hashing indirectly by checking that the
// stored passwordHash differs from the plaintext password.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildJwtService(): JwtService {
  return {
    signAsync: vi.fn().mockResolvedValue("mocked-token"),
    verifyAsync: vi.fn(),
  } as unknown as JwtService;
}

const AGENCY_ID = "agency-uuid-1";
const USER_ID = "user-uuid-1";

const mockUser = {
  id: USER_ID,
  email: "owner@agency.com",
  name: "Test Owner",
  passwordHash: "$2b$12$hashedpassword",
  avatarUrl: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

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

const mockMember = {
  id: "member-uuid-1",
  userId: USER_ID,
  agencyId: AGENCY_ID,
  role: UserRole.OWNER,
  acceptedAt: new Date("2024-01-01"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("AuthService", () => {
  let service: AuthService;
  let prisma: MockPrismaService;
  let jwtService: JwtService;

  beforeEach(() => {
    prisma = createPrismaMock();
    jwtService = buildJwtService();
    service = new AuthService(prisma as never, jwtService);

    // Default: slug is unique
    prisma.agency.findUnique.mockResolvedValue(null);
    prisma.agency.findMany.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe("register", () => {
    it("creates an agency, user, and member then returns tokens and user data", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: (tx: MockPrismaService) => Promise<unknown>) => {
        const tx = createPrismaMock();
        tx.user.create.mockResolvedValue(mockUser);
        tx.agency.create.mockResolvedValue(mockAgency);
        tx.agencyMember.create.mockResolvedValue(mockMember);
        return fn(tx);
      });

      const result = await service.register({
        email: "owner@agency.com",
        password: "StrongP@ss1",
        name: "Test Owner",
        agencyName: "Test Agency",
      });

      expect(result.user.email).toBe("owner@agency.com");
      expect(result.user.role).toBe(UserRole.OWNER);
      expect(result.accessToken).toBe("mocked-token");
      expect(result.refreshToken).toBe("mocked-token");
    });

    it("stores a bcrypt hash rather than the plaintext password", async () => {
      let capturedHash: string | undefined;

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: (tx: MockPrismaService) => Promise<unknown>) => {
        const tx = createPrismaMock();
        tx.user.create.mockImplementation((args: { data: { passwordHash: string } }) => {
          capturedHash = args.data.passwordHash;
          return Promise.resolve(mockUser);
        });
        tx.agency.create.mockResolvedValue(mockAgency);
        tx.agencyMember.create.mockResolvedValue(mockMember);
        return fn(tx);
      });

      await service.register({
        email: "owner@agency.com",
        password: "StrongP@ss1",
        name: "Test Owner",
        agencyName: "Test Agency",
      });

      expect(capturedHash).toBeDefined();
      expect(capturedHash).not.toBe("StrongP@ss1");
      // bcrypt hashes always start with $2b$ (12 rounds)
      expect(capturedHash).toMatch(/^\$2b\$/);
    });

    it("throws ConflictException when the email is already registered", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: "owner@agency.com",
          password: "StrongP@ss1",
          name: "Test Owner",
          agencyName: "Test Agency",
        })
      ).rejects.toThrow(ConflictException);
    });

    it("appends a numeric suffix when the agency slug already exists", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      // First findUnique on agency (base slug taken), findMany returns one sibling
      prisma.agency.findUnique
        .mockResolvedValueOnce({ id: "existing", slug: "test-agency" });
      prisma.agency.findMany.mockResolvedValue([{ slug: "test-agency-2" }]);

      let capturedSlug: string | undefined;
      prisma.$transaction.mockImplementation(async (fn: (tx: MockPrismaService) => Promise<unknown>) => {
        const tx = createPrismaMock();
        tx.user.create.mockResolvedValue(mockUser);
        tx.agency.create.mockImplementation((args: { data: { slug: string } }) => {
          capturedSlug = args.data.slug;
          return Promise.resolve({ ...mockAgency, slug: args.data.slug });
        });
        tx.agencyMember.create.mockResolvedValue(mockMember);
        return fn(tx);
      });

      await service.register({
        email: "other@agency.com",
        password: "StrongP@ss1",
        name: "Other Owner",
        agencyName: "Test Agency",
      });

      expect(capturedSlug).toBe("test-agency-3");
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe("login", () => {
    it("returns tokens and user data for valid credentials", async () => {
      const hash = await bcrypt.hash("correct-password", 10);
      const userWithMembership = {
        ...mockUser,
        passwordHash: hash,
        memberships: [mockMember],
      };

      prisma.user.findUnique.mockResolvedValue(userWithMembership);

      const result = await service.login({
        email: "owner@agency.com",
        password: "correct-password",
      });

      expect(result.user.id).toBe(USER_ID);
      expect(result.user.agencyId).toBe(AGENCY_ID);
      expect(result.accessToken).toBe("mocked-token");
    });

    it("throws UnauthorizedException when user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "ghost@example.com", password: "any" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException for wrong password", async () => {
      const hash = await bcrypt.hash("correct-password", 10);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        memberships: [mockMember],
      });

      await expect(
        service.login({ email: "owner@agency.com", password: "wrong-password" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when user has no agency membership", async () => {
      const hash = await bcrypt.hash("correct-password", 10);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        memberships: [],
      });

      await expect(
        service.login({ email: "owner@agency.com", password: "correct-password" })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // refreshTokens
  // -------------------------------------------------------------------------

  describe("refreshTokens", () => {
    it("returns a new token pair when refresh token is valid", async () => {
      const jwtPayload = {
        sub: USER_ID,
        agencyId: AGENCY_ID,
        role: UserRole.OWNER,
      };
      vi.mocked(jwtService.verifyAsync).mockResolvedValue(jwtPayload);
      prisma.agencyMember.findFirst.mockResolvedValue(mockMember);

      const result = await service.refreshTokens("valid-refresh-token");

      expect(result.accessToken).toBe("mocked-token");
      expect(result.refreshToken).toBe("mocked-token");
      expect(jwtService.verifyAsync).toHaveBeenCalledWith("valid-refresh-token", {
        secret: process.env["JWT_REFRESH_SECRET"],
      });
    });

    it("throws UnauthorizedException when the refresh token is invalid", async () => {
      vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error("jwt expired"));

      await expect(service.refreshTokens("expired-token")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("throws UnauthorizedException when membership no longer exists", async () => {
      vi.mocked(jwtService.verifyAsync).mockResolvedValue({
        sub: USER_ID,
        agencyId: AGENCY_ID,
        role: UserRole.OWNER,
      });
      prisma.agencyMember.findFirst.mockResolvedValue(null);

      await expect(service.refreshTokens("valid-token")).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // -------------------------------------------------------------------------
  // getMe
  // -------------------------------------------------------------------------

  describe("getMe", () => {
    it("returns user profile with agency and role", async () => {
      const userWithMembership = {
        id: USER_ID,
        email: "owner@agency.com",
        name: "Test Owner",
        avatarUrl: null,
        createdAt: new Date("2024-01-01"),
        memberships: [
          {
            role: UserRole.OWNER,
            agency: {
              id: AGENCY_ID,
              name: "Test Agency",
              slug: "test-agency",
              logoUrl: null,
            },
          },
        ],
      };

      prisma.user.findUniqueOrThrow.mockResolvedValue(userWithMembership);

      const result = await service.getMe(USER_ID, AGENCY_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.agency.id).toBe(AGENCY_ID);
      expect(result.role).toBe(UserRole.OWNER);
    });

    it("throws UnauthorizedException when membership is not found for the agency", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: USER_ID,
        email: "owner@agency.com",
        name: "Test Owner",
        avatarUrl: null,
        createdAt: new Date("2024-01-01"),
        memberships: [],
      });

      await expect(service.getMe(USER_ID, AGENCY_ID)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // -------------------------------------------------------------------------
  // generateTokens
  // -------------------------------------------------------------------------

  describe("generateTokens", () => {
    it("signs both access and refresh tokens with the correct secrets", async () => {
      await service.generateTokens({
        sub: USER_ID,
        agencyId: AGENCY_ID,
        role: UserRole.OWNER,
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: USER_ID, agencyId: AGENCY_ID, role: UserRole.OWNER },
        expect.objectContaining({ secret: process.env["JWT_SECRET"] })
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: USER_ID, agencyId: AGENCY_ID, role: UserRole.OWNER },
        expect.objectContaining({ secret: process.env["JWT_REFRESH_SECRET"] })
      );
    });
  });
});
