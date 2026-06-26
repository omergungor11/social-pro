import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PostingSlot, PostStatus } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { PostService } from "./post.service";
import { CreatePostingSlotDto } from "./dto/posting-slot.dto";

export interface BulkScheduleResultItem {
  postId: string;
  scheduledAt: string | null;
  success: boolean;
  error?: string;
}

const MAX_LOOKAHEAD_DAYS = 366;

/**
 * Manages recurring "queue slots" (predefined weekly posting times) and uses
 * them to bulk-schedule DRAFT posts onto the next available free slots —
 * Buffer-style queueing.
 *
 * Slot times are interpreted in the agency's local wall clock (server time);
 * full per-agency timezone conversion is a follow-up.
 */
@Injectable()
export class QueueSlotService {
  private readonly logger = new Logger(QueueSlotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postService: PostService
  ) {}

  // ---------------------------------------------------------------------------
  // Slot CRUD
  // ---------------------------------------------------------------------------

  async listSlots(agencyId: string): Promise<PostingSlot[]> {
    return this.prisma.postingSlot.findMany({
      where: { agencyId },
      orderBy: [{ dayOfWeek: "asc" }, { hour: "asc" }, { minute: "asc" }],
    });
  }

  async createSlot(
    agencyId: string,
    dto: CreatePostingSlotDto
  ): Promise<PostingSlot> {
    if (dto.socialAccountId) {
      const account = await this.prisma.socialAccount.findFirst({
        where: { id: dto.socialAccountId, agencyId },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException("socialAccountId does not belong to this agency");
      }
    }

    return this.prisma.postingSlot.create({
      data: {
        agencyId,
        dayOfWeek: dto.dayOfWeek,
        hour: dto.hour,
        minute: dto.minute ?? 0,
        socialAccountId: dto.socialAccountId ?? null,
      },
    });
  }

  async deleteSlot(agencyId: string, slotId: string): Promise<void> {
    const slot = await this.prisma.postingSlot.findFirst({
      where: { id: slotId, agencyId },
    });
    if (!slot) {
      throw new NotFoundException("Posting slot not found in this agency");
    }
    await this.prisma.postingSlot.delete({ where: { id: slotId } });
  }

  // ---------------------------------------------------------------------------
  // Slot computation + bulk scheduling
  // ---------------------------------------------------------------------------

  /**
   * Computes the next `count` free slot datetimes starting from now, skipping
   * times already taken by an existing scheduled post.
   */
  async computeNextSlotTimes(agencyId: string, count: number): Promise<Date[]> {
    if (count <= 0) return [];

    const slots = await this.prisma.postingSlot.findMany({
      where: { agencyId, isActive: true },
    });
    if (slots.length === 0) return [];

    const now = Date.now();
    const scheduled = await this.prisma.post.findMany({
      where: {
        agencyId,
        status: PostStatus.SCHEDULED,
        scheduledAt: { gte: new Date(now) },
      },
      select: { scheduledAt: true },
    });
    const taken = new Set<number>(
      scheduled
        .map((s) => s.scheduledAt?.getTime())
        .filter((t): t is number => typeof t === "number")
    );

    const result: Date[] = [];
    const base = new Date();

    for (let d = 0; d < MAX_LOOKAHEAD_DAYS && result.length < count; d++) {
      const day = new Date(base);
      day.setDate(base.getDate() + d);
      const dow = day.getDay();

      const daySlots = slots
        .filter((s) => s.dayOfWeek === dow)
        .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

      for (const slot of daySlots) {
        const dt = new Date(day);
        dt.setHours(slot.hour, slot.minute, 0, 0);
        const ts = dt.getTime();
        if (ts <= now || taken.has(ts)) continue;

        result.push(dt);
        taken.add(ts);
        if (result.length >= count) break;
      }
    }

    return result;
  }

  /**
   * Distributes the given DRAFT posts across the next free queue slots.
   * Each post is scheduled independently; per-post failures are reported
   * rather than aborting the whole batch.
   */
  async bulkSchedule(
    agencyId: string,
    postIds: string[]
  ): Promise<BulkScheduleResultItem[]> {
    const times = await this.computeNextSlotTimes(agencyId, postIds.length);

    if (times.length === 0) {
      throw new BadRequestException(
        "No active posting slots configured. Add queue slots before bulk scheduling."
      );
    }

    const results: BulkScheduleResultItem[] = [];

    for (let i = 0; i < postIds.length; i++) {
      const postId = postIds[i]!;
      const slotTime = times[i];

      if (!slotTime) {
        results.push({
          postId,
          scheduledAt: null,
          success: false,
          error: "No free slot available — add more posting slots.",
        });
        continue;
      }

      try {
        await this.postService.schedule(agencyId, postId, slotTime);
        results.push({
          postId,
          scheduledAt: slotTime.toISOString(),
          success: true,
        });
      } catch (err) {
        results.push({
          postId,
          scheduledAt: null,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.log(
      `Bulk schedule for agency=${agencyId}: ` +
        `${results.filter((r) => r.success).length}/${postIds.length} scheduled`
    );

    return results;
  }
}
