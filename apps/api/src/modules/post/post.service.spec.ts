import { describe, it, expect, beforeEach, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PostStatus } from "@social-pro/prisma";
import { PostService } from "./post.service";
import { PostSchedulerService } from "./jobs/post-scheduler.service";
import { PublisherService } from "./publisher/publisher.service";
import { createPrismaMock, resetPrismaMock, type MockPrismaService } from "../../test/prisma-mock";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGENCY_ID = "agency-uuid-1";
const USER_ID = "user-uuid-1";
const POST_ID = "post-uuid-1";

function buildPost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: POST_ID,
    agencyId: AGENCY_ID,
    createdByUserId: USER_ID,
    clientId: null,
    title: "Test Post",
    content: "Hello World",
    status: PostStatus.DRAFT,
    scheduledAt: null,
    publishedAt: null,
    aiGenerated: false,
    aiPrompt: null,
    createdAt: new Date("2024-06-01T10:00:00Z"),
    updatedAt: new Date("2024-06-01T10:00:00Z"),
    ...overrides,
  };
}

function buildPostFull(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...buildPost(overrides),
    media: [],
    targets: [],
    approvals: [],
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("PostService", () => {
  let service: PostService;
  let prisma: MockPrismaService;
  let scheduler: PostSchedulerService;
  let publisher: PublisherService;

  beforeEach(() => {
    prisma = createPrismaMock();

    scheduler = {
      schedulePost: vi.fn().mockResolvedValue(undefined),
      cancelScheduledPost: vi.fn().mockResolvedValue(undefined),
      reschedulePost: vi.fn().mockResolvedValue(undefined),
    } as unknown as PostSchedulerService;

    publisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as PublisherService;

    service = new PostService(prisma as never, scheduler, publisher);
  });

  afterEach(() => {
    resetPrismaMock(prisma);
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("creates a post and returns the full post with relations", async () => {
      const created = buildPost();
      const fullPost = buildPostFull();

      prisma.post.create.mockResolvedValue(created);
      // findOne is called after create
      prisma.post.findFirst.mockResolvedValue(fullPost);

      const result = await service.create(AGENCY_ID, USER_ID, {
        content: "Hello World",
        title: "Test Post",
      });

      expect(result.id).toBe(POST_ID);
      expect(result.status).toBe(PostStatus.DRAFT);
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agencyId: AGENCY_ID,
            createdByUserId: USER_ID,
            status: PostStatus.DRAFT,
          }),
        })
      );
    });

    it("creates post with targets when targets are provided", async () => {
      const created = buildPost();
      const fullPost = buildPostFull({
        targets: [{ id: "target-1", postId: POST_ID, socialAccountId: "sa-1" }],
      });

      prisma.post.create.mockResolvedValue(created);
      prisma.post.findFirst.mockResolvedValue(fullPost);

      await service.create(AGENCY_ID, USER_ID, {
        content: "Hello World",
        targets: [{ socialAccountId: "sa-1" }],
      });

      const createCall = prisma.post.create.mock.calls[0]?.[0] as {
        data: { targets?: { create: unknown[] } };
      };
      expect(createCall.data.targets?.create).toHaveLength(1);
    });

    it("does not create targets relation when targets array is empty", async () => {
      const created = buildPost();
      prisma.post.create.mockResolvedValue(created);
      prisma.post.findFirst.mockResolvedValue(buildPostFull());

      await service.create(AGENCY_ID, USER_ID, { content: "Hello World", targets: [] });

      const createCall = prisma.post.create.mock.calls[0]?.[0] as {
        data: { targets?: unknown };
      };
      expect(createCall.data.targets).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------

  describe("findOne", () => {
    it("returns the full post when found", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPostFull());

      const result = await service.findOne(AGENCY_ID, POST_ID);

      expect(result.id).toBe(POST_ID);
      expect(result.media).toBeDefined();
      expect(result.targets).toBeDefined();
    });

    it("throws NotFoundException when post does not exist", async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.findOne(AGENCY_ID, "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("scopes query to the correct agency", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPostFull());

      await service.findOne(AGENCY_ID, POST_ID);

      expect(prisma.post.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agencyId: AGENCY_ID, id: POST_ID }),
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("updates a DRAFT post and returns the updated post", async () => {
      const draftPost = buildPost({ status: PostStatus.DRAFT });
      const updatedFull = buildPostFull({ content: "Updated content" });

      // assertExists
      prisma.post.findFirst
        .mockResolvedValueOnce(draftPost)
        // findOne called after update
        .mockResolvedValueOnce(updatedFull);

      prisma.$transaction.mockImplementation(async (fn: (tx: MockPrismaService) => Promise<unknown>) => {
        const tx = createPrismaMock();
        tx.post.update.mockResolvedValue({ ...draftPost, content: "Updated content" });
        return fn(tx);
      });

      const result = await service.update(AGENCY_ID, POST_ID, { content: "Updated content" });

      expect(result.content).toBe("Updated content");
    });

    it("allows updating a SCHEDULED post", async () => {
      const scheduledPost = buildPost({ status: PostStatus.SCHEDULED });
      const updatedFull = buildPostFull({ status: PostStatus.SCHEDULED, title: "New Title" });

      prisma.post.findFirst
        .mockResolvedValueOnce(scheduledPost)
        .mockResolvedValueOnce(updatedFull);

      prisma.$transaction.mockImplementation(async (fn: (tx: MockPrismaService) => Promise<unknown>) => {
        const tx = createPrismaMock();
        tx.post.update.mockResolvedValue({ ...scheduledPost, title: "New Title" });
        return fn(tx);
      });

      const result = await service.update(AGENCY_ID, POST_ID, { title: "New Title" });
      expect(result.title).toBe("New Title");
    });

    it("throws BadRequestException when post is PUBLISHED", async () => {
      prisma.post.findFirst.mockResolvedValue(
        buildPost({ status: PostStatus.PUBLISHED })
      );

      await expect(
        service.update(AGENCY_ID, POST_ID, { content: "X" })
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when post is CANCELLED", async () => {
      prisma.post.findFirst.mockResolvedValue(
        buildPost({ status: PostStatus.CANCELLED })
      );

      await expect(
        service.update(AGENCY_ID, POST_ID, { content: "X" })
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException when post does not exist", async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(
        service.update(AGENCY_ID, "non-existent", { content: "X" })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe("remove", () => {
    it("deletes a DRAFT post without cancelling any scheduler job", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPost({ status: PostStatus.DRAFT }));
      prisma.post.delete.mockResolvedValue(buildPost());

      await service.remove(AGENCY_ID, POST_ID);

      expect(scheduler.cancelScheduledPost).not.toHaveBeenCalled();
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: POST_ID } });
    });

    it("cancels the scheduler job before deleting a SCHEDULED post", async () => {
      prisma.post.findFirst.mockResolvedValue(
        buildPost({ status: PostStatus.SCHEDULED })
      );
      prisma.post.delete.mockResolvedValue(buildPost());

      await service.remove(AGENCY_ID, POST_ID);

      expect(scheduler.cancelScheduledPost).toHaveBeenCalledWith(POST_ID);
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: POST_ID } });
    });

    it("throws NotFoundException when post does not exist", async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.remove(AGENCY_ID, "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  // -------------------------------------------------------------------------
  // schedule
  // -------------------------------------------------------------------------

  describe("schedule", () => {
    it("schedules a DRAFT post and updates its status", async () => {
      const futureDate = new Date(Date.now() + 60_000);
      const draftPost = buildPost({ status: PostStatus.DRAFT });
      const scheduledPost = buildPostFull({ status: PostStatus.SCHEDULED, scheduledAt: futureDate });

      prisma.post.findFirst
        .mockResolvedValueOnce(draftPost)
        .mockResolvedValueOnce(scheduledPost);
      prisma.post.update.mockResolvedValue({ ...draftPost, status: PostStatus.SCHEDULED });

      const result = await service.schedule(AGENCY_ID, POST_ID, futureDate);

      expect(scheduler.schedulePost).toHaveBeenCalledWith(POST_ID, AGENCY_ID, futureDate);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PostStatus.SCHEDULED }),
        })
      );
      expect(result.status).toBe(PostStatus.SCHEDULED);
    });

    it("reschedules rather than schedules when the post is already SCHEDULED", async () => {
      const futureDate = new Date(Date.now() + 120_000);
      const scheduledPost = buildPost({ status: PostStatus.SCHEDULED });
      const rescheduledFull = buildPostFull({ status: PostStatus.SCHEDULED, scheduledAt: futureDate });

      prisma.post.findFirst
        .mockResolvedValueOnce(scheduledPost)
        .mockResolvedValueOnce(rescheduledFull);
      prisma.post.update.mockResolvedValue({ ...scheduledPost, scheduledAt: futureDate });

      await service.schedule(AGENCY_ID, POST_ID, futureDate);

      expect(scheduler.reschedulePost).toHaveBeenCalledWith(POST_ID, AGENCY_ID, futureDate);
      expect(scheduler.schedulePost).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when scheduledAt is in the past", async () => {
      const pastDate = new Date(Date.now() - 10_000);
      prisma.post.findFirst.mockResolvedValue(buildPost({ status: PostStatus.DRAFT }));

      await expect(service.schedule(AGENCY_ID, POST_ID, pastDate)).rejects.toThrow(
        BadRequestException
      );
    });

    it("throws BadRequestException when post is PUBLISHED", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPost({ status: PostStatus.PUBLISHED }));

      await expect(
        service.schedule(AGENCY_ID, POST_ID, new Date(Date.now() + 60_000))
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // publishNow
  // -------------------------------------------------------------------------

  describe("publishNow", () => {
    it("publishes a DRAFT post immediately", async () => {
      const draftPost = buildPost({ status: PostStatus.DRAFT });
      const fullPost = { ...buildPost({ status: PostStatus.PUBLISHING }), media: [], targets: [], approvals: [] };
      const publishedFull = buildPostFull({ status: PostStatus.PUBLISHED });

      prisma.post.findFirst
        .mockResolvedValueOnce(draftPost)
        .mockResolvedValueOnce(publishedFull);
      prisma.post.update.mockResolvedValue({ ...draftPost, status: PostStatus.PUBLISHING });
      prisma.post.findUnique.mockResolvedValue(fullPost);

      const result = await service.publishNow(AGENCY_ID, POST_ID);

      expect(publisher.publish).toHaveBeenCalled();
      expect(result.status).toBe(PostStatus.PUBLISHED);
    });

    it("cancels the scheduled job before publishing a SCHEDULED post", async () => {
      const scheduledPost = buildPost({ status: PostStatus.SCHEDULED });
      const fullPost = { ...buildPost({ status: PostStatus.PUBLISHING }), media: [], targets: [], approvals: [] };
      const publishedFull = buildPostFull({ status: PostStatus.PUBLISHED });

      prisma.post.findFirst
        .mockResolvedValueOnce(scheduledPost)
        .mockResolvedValueOnce(publishedFull);
      prisma.post.update.mockResolvedValue({ ...scheduledPost, status: PostStatus.PUBLISHING });
      prisma.post.findUnique.mockResolvedValue(fullPost);

      await service.publishNow(AGENCY_ID, POST_ID);

      expect(scheduler.cancelScheduledPost).toHaveBeenCalledWith(POST_ID);
    });

    it("throws BadRequestException when post is already PUBLISHED", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPost({ status: PostStatus.PUBLISHED }));

      await expect(service.publishNow(AGENCY_ID, POST_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it("throws BadRequestException when post is CANCELLED", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPost({ status: PostStatus.CANCELLED }));

      await expect(service.publishNow(AGENCY_ID, POST_ID)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // -------------------------------------------------------------------------
  // cancel
  // -------------------------------------------------------------------------

  describe("cancel", () => {
    it("cancels a SCHEDULED post and sets status to CANCELLED", async () => {
      const scheduledPost = buildPost({ status: PostStatus.SCHEDULED });
      const cancelledFull = buildPostFull({ status: PostStatus.CANCELLED, scheduledAt: null });

      prisma.post.findFirst
        .mockResolvedValueOnce(scheduledPost)
        .mockResolvedValueOnce(cancelledFull);
      prisma.post.update.mockResolvedValue({
        ...scheduledPost,
        status: PostStatus.CANCELLED,
        scheduledAt: null,
      });

      const result = await service.cancel(AGENCY_ID, POST_ID);

      expect(scheduler.cancelScheduledPost).toHaveBeenCalledWith(POST_ID);
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PostStatus.CANCELLED,
            scheduledAt: null,
          }),
        })
      );
      expect(result.status).toBe(PostStatus.CANCELLED);
    });

    it("throws BadRequestException when post is not SCHEDULED", async () => {
      prisma.post.findFirst.mockResolvedValue(buildPost({ status: PostStatus.DRAFT }));

      await expect(service.cancel(AGENCY_ID, POST_ID)).rejects.toThrow(
        BadRequestException
      );
    });

    it("throws NotFoundException when post does not exist", async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      await expect(service.cancel(AGENCY_ID, "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
