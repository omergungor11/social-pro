import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  Post,
  PostApproval,
  PostMedia,
  PostStatus,
  PostTarget,
  SocialAccount,
} from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaginatedResponseDto } from "../common/dto/pagination.dto";
import { CreatePostDto, PostMediaInputDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";
import { PostListQueryDto } from "./dto/post-list-query.dto";
import { PostSchedulerService } from "./jobs/post-scheduler.service";
import { PublisherService } from "./publisher/publisher.service";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type SocialAccountSummary = Pick<
  SocialAccount,
  "id" | "platform" | "platformUsername" | "displayName" | "avatarUrl" | "isActive"
>;

type PostTargetWithAccount = PostTarget & { socialAccount: SocialAccountSummary };

export type PostFull = Post & {
  media: PostMedia[];
  targets: PostTargetWithAccount[];
  approvals: PostApproval[];
};

type PostTargetListItem = Pick<PostTarget, "id" | "status" | "publishedAt"> & {
  socialAccount: Pick<SocialAccount, "platform" | "displayName"> | null;
};

type PostListItem = Post & {
  _count: { targets: number; media: number };
  targets: PostTargetListItem[];
  client: { id: string; name: string } | null;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const MUTABLE_STATUSES: ReadonlySet<PostStatus> = new Set([
  PostStatus.DRAFT,
  PostStatus.SCHEDULED,
]);

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: PostSchedulerService,
    private readonly publisher: PublisherService
  ) {}

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  async list(
    agencyId: string,
    query: PostListQueryDto
  ): Promise<PaginatedResponseDto<PostListItem>> {
    const { page, limit, status, platform, clientId, startDate, endDate, socialAccountId } = query;
    const skip = (page - 1) * limit;

    const where = {
      agencyId,
      ...(status != null && { status }),
      ...(clientId != null && { clientId }),
      ...(startDate != null || endDate != null
        ? {
            scheduledAt: {
              ...(startDate != null && { gte: new Date(startDate) }),
              ...(endDate != null && { lte: new Date(endDate) }),
            },
          }
        : {}),
      ...(platform != null
        ? {
            targets: {
              some: { socialAccount: { platform } },
            },
          }
        : {}),
      ...(socialAccountId != null
        ? { targets: { some: { socialAccountId } } }
        : {}),
    };

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        include: {
          _count: { select: { targets: true, media: true } },
          targets: {
            select: { id: true, status: true, publishedAt: true, socialAccount: { select: { platform: true, displayName: true } } },
          },
          client: { select: { id: true, name: true } },
          media: { select: { id: true, url: true, thumbnailUrl: true, mediaType: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return PaginatedResponseDto.of(posts as PostListItem[], total, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(
    agencyId: string,
    userId: string,
    dto: CreatePostDto
  ): Promise<PostFull> {
    const post = await this.prisma.post.create({
      data: {
        agencyId,
        createdByUserId: userId,
        clientId: dto.clientId ?? null,
        title: dto.title ?? null,
        content: dto.content,
        status: PostStatus.DRAFT,
        aiGenerated: dto.aiGenerated ?? false,
        aiPrompt: dto.aiPrompt ?? null,
        targets: dto.targets?.length
          ? {
              create: dto.targets.map((t) => ({
                socialAccountId: t.socialAccountId,
                platformSpecificContent: t.platformSpecificContent ?? null,
              })),
            }
          : undefined,
        media: dto.media?.length
          ? {
              create: dto.media.map((m, idx) =>
                this.buildPostMediaCreateInput(m, idx)
              ),
            }
          : undefined,
      },
    });

    this.logger.log(`Post created: id=${post.id} agencyId=${agencyId} userId=${userId}`);
    return this.findOne(agencyId, post.id);
  }

  // ---------------------------------------------------------------------------
  // Find one
  // ---------------------------------------------------------------------------

  async findOne(agencyId: string, postId: string): Promise<PostFull> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, agencyId },
      include: {
        media: { orderBy: { sortOrder: "asc" } },
        targets: {
          include: {
            socialAccount: {
              select: {
                id: true,
                platform: true,
                platformUsername: true,
                displayName: true,
                avatarUrl: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        approvals: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post '${postId}' not found in this agency`);
    }

    return post as unknown as PostFull;
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  async update(
    agencyId: string,
    postId: string,
    dto: UpdatePostDto
  ): Promise<PostFull> {
    const existing = await this.assertExists(agencyId, postId);

    if (!MUTABLE_STATUSES.has(existing.status)) {
      throw new BadRequestException(
        `Post '${postId}' is in status '${existing.status}' and cannot be edited. ` +
          `Only DRAFT and SCHEDULED posts can be updated.`
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.clientId !== undefined && { clientId: dto.clientId }),
          ...(dto.aiGenerated !== undefined && { aiGenerated: dto.aiGenerated }),
          ...(dto.aiPrompt !== undefined && { aiPrompt: dto.aiPrompt }),
        },
      });

      // Replace targets when provided
      if (dto.targets !== undefined) {
        await tx.postTarget.deleteMany({ where: { postId } });
        if (dto.targets.length > 0) {
          await tx.postTarget.createMany({
            data: dto.targets.map((t) => ({
              postId,
              socialAccountId: t.socialAccountId,
              platformSpecificContent: t.platformSpecificContent ?? null,
            })),
          });
        }
      }
    });

    this.logger.log(`Post updated: id=${postId} agencyId=${agencyId}`);
    return this.findOne(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Remove
  // ---------------------------------------------------------------------------

  async remove(agencyId: string, postId: string): Promise<void> {
    const post = await this.assertExists(agencyId, postId);

    if (post.status === PostStatus.SCHEDULED) {
      await this.scheduler.cancelScheduledPost(postId);
    }

    await this.prisma.post.delete({ where: { id: postId } });
    this.logger.log(`Post deleted: id=${postId} agencyId=${agencyId}`);
  }

  // ---------------------------------------------------------------------------
  // Schedule
  // ---------------------------------------------------------------------------

  async schedule(
    agencyId: string,
    postId: string,
    scheduledAt: Date
  ): Promise<PostFull> {
    const post = await this.assertExists(agencyId, postId);

    if (
      post.status !== PostStatus.DRAFT &&
      post.status !== PostStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        `Post '${postId}' cannot be scheduled from status '${post.status}'`
      );
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException("scheduledAt must be a future datetime");
    }

    // If already scheduled, reschedule the BullMQ job
    if (post.status === PostStatus.SCHEDULED) {
      await this.scheduler.reschedulePost(postId, agencyId, scheduledAt);
    } else {
      await this.scheduler.schedulePost(postId, agencyId, scheduledAt);
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.SCHEDULED, scheduledAt },
    });

    this.logger.log(
      `Post scheduled: id=${postId} agencyId=${agencyId} scheduledAt=${scheduledAt.toISOString()}`
    );

    return this.findOne(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Publish now
  // ---------------------------------------------------------------------------

  async publishNow(agencyId: string, postId: string): Promise<PostFull> {
    const post = await this.assertExists(agencyId, postId);

    if (
      post.status !== PostStatus.DRAFT &&
      post.status !== PostStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        `Post '${postId}' cannot be published from status '${post.status}'`
      );
    }

    // Cancel any scheduled job before immediate publish
    if (post.status === PostStatus.SCHEDULED) {
      await this.scheduler.cancelScheduledPost(postId);
    }

    const fullPost = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: true,
        targets: { include: { socialAccount: true } },
        approvals: true,
      },
    });

    if (!fullPost) {
      throw new NotFoundException(`Post '${postId}' not found`);
    }

    const pendingTargets = (fullPost.targets ?? []).filter(
      (t) => t.status === "PENDING" || t.status === "PUBLISHING"
    );

    if (pendingTargets.length === 0) {
      // No targets — mark as published directly (internal/draft publish)
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
      });
      this.logger.log(`Post published (no targets): id=${postId} agencyId=${agencyId}`);
    } else {
      // Has targets — attempt real platform publishing
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.PUBLISHING },
      });

      try {
        await this.publisher.publish(fullPost);
      } catch (err) {
        this.logger.error(`Publish failed for post ${postId}: ${String(err)}`);
        // Mark as published anyway since content is saved — targets show individual failures
        await this.prisma.post.update({
          where: { id: postId },
          data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
        });
      }

      this.logger.log(`Post publish triggered: id=${postId} agencyId=${agencyId}`);
    }

    return this.findOne(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  async cancel(agencyId: string, postId: string): Promise<PostFull> {
    const post = await this.assertExists(agencyId, postId);

    if (post.status !== PostStatus.SCHEDULED) {
      throw new BadRequestException(
        `Post '${postId}' is not scheduled (current status: '${post.status}')`
      );
    }

    await this.scheduler.cancelScheduledPost(postId);

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.CANCELLED, scheduledAt: null },
    });

    this.logger.log(`Post cancelled: id=${postId} agencyId=${agencyId}`);
    return this.findOne(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Calendar view
  // ---------------------------------------------------------------------------

  /**
   * Returns posts in a date range, ordered by scheduledAt, for calendar display.
   * Only SCHEDULED and PUBLISHED posts appear in the calendar.
   */
  async getCalendar(
    agencyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PostListItem[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        agencyId,
        status: { in: [PostStatus.SCHEDULED, PostStatus.PUBLISHED] },
        scheduledAt: { gte: startDate, lte: endDate },
      },
      include: { _count: { select: { targets: true, media: true } } },
      orderBy: { scheduledAt: "asc" },
    });

    return posts as PostListItem[];
  }

  // ---------------------------------------------------------------------------
  // Media management
  // ---------------------------------------------------------------------------

  async attachMedia(
    agencyId: string,
    postId: string,
    mediaData: PostMediaInputDto[]
  ): Promise<PostFull> {
    await this.assertExists(agencyId, postId);

    // Determine next sortOrder offset
    const maxOrder = await this.prisma.postMedia.aggregate({
      where: { postId },
      _max: { sortOrder: true },
    });
    const baseOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    await this.prisma.postMedia.createMany({
      data: mediaData.map((m, idx) => ({
        postId,
        ...this.buildPostMediaCreateInput(m, baseOrder + idx),
      })),
    });

    this.logger.log(
      `Media attached: postId=${postId} count=${mediaData.length} agencyId=${agencyId}`
    );

    return this.findOne(agencyId, postId);
  }

  async removeMedia(
    agencyId: string,
    postId: string,
    mediaId: string
  ): Promise<PostFull> {
    // Confirm post belongs to agency
    await this.assertExists(agencyId, postId);

    const media = await this.prisma.postMedia.findFirst({
      where: { id: mediaId, postId },
    });

    if (!media) {
      throw new NotFoundException(
        `Media '${mediaId}' not found on post '${postId}'`
      );
    }

    await this.prisma.postMedia.delete({ where: { id: mediaId } });

    this.logger.log(
      `Media removed: mediaId=${mediaId} postId=${postId} agencyId=${agencyId}`
    );

    return this.findOne(agencyId, postId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async assertExists(agencyId: string, postId: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, agencyId },
    });

    if (!post) {
      throw new NotFoundException(`Post '${postId}' not found in this agency`);
    }

    return post;
  }

  private buildPostMediaCreateInput(
    m: PostMediaInputDto,
    sortOrder: number
  ): {
    url: string;
    mediaType: PostMediaInputDto["mediaType"];
    storageKey: string | null;
    thumbnailUrl: string | null;
    fileSize: number | null;
    mimeType: string | null;
    altText: string | null;
    sortOrder: number;
  } {
    return {
      url: m.url,
      mediaType: m.mediaType,
      storageKey: m.storageKey ?? null,
      thumbnailUrl: m.thumbnailUrl ?? null,
      fileSize: m.fileSize ?? null,
      mimeType: m.mimeType ?? null,
      altText: m.altText ?? null,
      sortOrder: m.sortOrder ?? sortOrder,
    };
  }
}
