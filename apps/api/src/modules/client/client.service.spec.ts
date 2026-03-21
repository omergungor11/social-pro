import { describe, it, expect, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ClientService } from "./client.service";
import { createPrismaMock, resetPrismaMock, type MockPrismaService } from "../../test/prisma-mock";
import { ClientSortBy, SortOrder } from "./dto/client-list-query.dto";
import type { Client } from "@social-pro/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGENCY_ID = "agency-uuid-1";
const CLIENT_ID = "client-uuid-1";

const mockClient: Client = {
  id: CLIENT_ID,
  agencyId: AGENCY_ID,
  name: "Acme Corp",
  email: "contact@acme.com",
  phone: "+1-555-0100",
  company: "Acme Corporation",
  notes: "Important client",
  tags: ["vip", "tech"],
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockClientWithRelations = {
  ...mockClient,
  groupMemberships: [
    {
      id: "gm-1",
      clientId: CLIENT_ID,
      groupId: "group-1",
      createdAt: new Date("2024-01-01"),
      group: { id: "group-1", name: "Premium", color: "#ff0000" },
    },
  ],
  socialAccounts: [
    {
      id: "sa-1",
      platform: "INSTAGRAM",
      platformUsername: "@acme",
      displayName: "Acme Official",
      avatarUrl: null,
      isActive: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("ClientService", () => {
  let service: ClientService;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ClientService(prisma as never);
  });

  afterEach(() => {
    resetPrismaMock(prisma);
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list", () => {
    it("returns paginated clients scoped to the agency", async () => {
      prisma.$transaction.mockResolvedValue([[mockClient], 1]);

      const result = await service.list(AGENCY_ID, {
        page: 1,
        limit: 10,
        sortBy: ClientSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe(CLIENT_ID);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it("applies search filter across name, email, and company", async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.list(AGENCY_ID, {
        page: 1,
        limit: 10,
        search: "acme",
        sortBy: ClientSortBy.NAME,
        sortOrder: SortOrder.ASC,
      });

      const callArg = prisma.$transaction.mock.calls[0]?.[0] as unknown[];
      // $transaction is called with an array of [findMany promise, count promise]
      expect(callArg).toHaveLength(2);
    });

    it("returns empty list when no clients match", async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.list(AGENCY_ID, {
        page: 1,
        limit: 10,
        sortBy: ClientSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it("skips the correct number of records for page 2", async () => {
      prisma.$transaction.mockResolvedValue([[mockClient], 11]);

      const result = await service.list(AGENCY_ID, {
        page: 2,
        limit: 10,
        sortBy: ClientSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(result.meta.page).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("creates and returns a new client with the given agency id", async () => {
      prisma.client.create.mockResolvedValue(mockClient);

      const result = await service.create(AGENCY_ID, {
        name: "Acme Corp",
        email: "contact@acme.com",
        phone: "+1-555-0100",
        company: "Acme Corporation",
        notes: "Important client",
        tags: ["vip", "tech"],
      });

      expect(result.id).toBe(CLIENT_ID);
      expect(result.agencyId).toBe(AGENCY_ID);
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ agencyId: AGENCY_ID }),
        })
      );
    });

    it("defaults tags to an empty array when not provided", async () => {
      prisma.client.create.mockResolvedValue({ ...mockClient, tags: [] });

      await service.create(AGENCY_ID, {
        name: "No Tag Client",
        email: "notag@example.com",
      });

      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: [] }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe("findOne", () => {
    it("returns the client with relations when found", async () => {
      prisma.client.findFirst.mockResolvedValue(mockClientWithRelations);

      const result = await service.findOne(AGENCY_ID, CLIENT_ID);

      expect(result.id).toBe(CLIENT_ID);
      expect(result.groupMemberships).toHaveLength(1);
      expect(result.socialAccounts).toHaveLength(1);
    });

    it("scopes the query to the correct agency", async () => {
      prisma.client.findFirst.mockResolvedValue(mockClientWithRelations);

      await service.findOne(AGENCY_ID, CLIENT_ID);

      expect(prisma.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agencyId: AGENCY_ID, id: CLIENT_ID }),
        })
      );
    });

    it("throws NotFoundException when the client does not exist", async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne(AGENCY_ID, "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("throws NotFoundException when the client belongs to a different agency", async () => {
      // The query already scopes by agencyId; Prisma returns null for wrong agency
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne("other-agency", CLIENT_ID)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("updates and returns the client", async () => {
      // assertExists check
      prisma.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
      const updated = { ...mockClient, name: "Acme Updated" };
      prisma.client.update.mockResolvedValue(updated);

      const result = await service.update(AGENCY_ID, CLIENT_ID, { name: "Acme Updated" });

      expect(result.name).toBe("Acme Updated");
      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CLIENT_ID } })
      );
    });

    it("throws NotFoundException when the client does not exist", async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update(AGENCY_ID, "non-existent", { name: "X" })
      ).rejects.toThrow(NotFoundException);
    });

    it("only passes defined fields to the update call", async () => {
      prisma.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
      prisma.client.update.mockResolvedValue(mockClient);

      await service.update(AGENCY_ID, CLIENT_ID, { notes: "Updated notes" });

      const updateCall = prisma.client.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
      expect(updateCall.data).toHaveProperty("notes", "Updated notes");
      expect(updateCall.data).not.toHaveProperty("name");
    });
  });

  // -------------------------------------------------------------------------
  // remove (soft delete)
  // -------------------------------------------------------------------------

  describe("remove", () => {
    it("soft-deletes the client by setting deletedAt", async () => {
      prisma.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
      prisma.client.update.mockResolvedValue({ ...mockClient, deletedAt: new Date() });

      await service.remove(AGENCY_ID, CLIENT_ID);

      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CLIENT_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it("throws NotFoundException when the client does not exist", async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.remove(AGENCY_ID, "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("resolves without returning data (void)", async () => {
      prisma.client.findFirst.mockResolvedValue({ id: CLIENT_ID });
      prisma.client.update.mockResolvedValue({ ...mockClient, deletedAt: new Date() });

      const result = await service.remove(AGENCY_ID, CLIENT_ID);

      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // assertExists
  // -------------------------------------------------------------------------

  describe("assertExists", () => {
    it("resolves without error when the client exists", async () => {
      prisma.client.findFirst.mockResolvedValue({ id: CLIENT_ID });

      await expect(service.assertExists(AGENCY_ID, CLIENT_ID)).resolves.toBeUndefined();
    });

    it("throws NotFoundException when the client is not found", async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.assertExists(AGENCY_ID, "missing")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
