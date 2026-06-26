import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ApprovalStatus, Post, PostStatus } from "@social-pro/prisma";
import { UserRole } from "@social-pro/shared-types";
import { PrismaService } from "../common/prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { PostService, PostFull } from "./post.service";

/**
 * Approval workflow for posts.
 *
 * Flow:
 *   DRAFT --requestApproval--> PENDING_APPROVAL --approve/reject--> DRAFT
 *
 * While a post sits in PENDING_APPROVAL it cannot be scheduled or published —
 * the existing status guards in {@link PostService} already reject any status
 * other than DRAFT/SCHEDULED, so approval acts as a real gate. Approving (or
 * rejecting) returns the post to DRAFT so the author can act on it again.
 *
 * Approve / reject are restricted to OWNER and ADMIN at the controller layer.
 */
@Injectable()
export class PostApprovalService {
  private readonly logger = new Logger(PostApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly postService: PostService,
    private readonly notifications: NotificationService
  ) {}

  /**
   * Author (any member) requests review of a DRAFT post.
   */
  async requestApproval(
    agencyId: string,
    postId: string,
    requestedByUserId: string
  ): Promise<PostFull> {
    const post = await this.assertPost(agencyId, postId);

    if (post.status !== PostStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT posts can be sent for approval (current status: '${post.status}')`
      );
    }

    await this.prisma.$transaction([
      this.prisma.postApproval.create({
        data: {
          postId,
          requestedBy: requestedByUserId,
          status: ApprovalStatus.PENDING,
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.PENDING_APPROVAL },
      }),
    ]);

    await this.notifyApprovers(agencyId, post, requestedByUserId);

    this.logger.log(
      `Approval requested: post=${postId} agency=${agencyId} by=${requestedByUserId}`
    );

    return this.postService.findOne(agencyId, postId);
  }

  /**
   * OWNER/ADMIN approves the pending request, returning the post to DRAFT.
   */
  async approve(
    agencyId: string,
    postId: string,
    approvalId: string,
    deciderUserId: string,
    comment?: string
  ): Promise<PostFull> {
    return this.decide(
      agencyId,
      postId,
      approvalId,
      deciderUserId,
      ApprovalStatus.APPROVED,
      comment
    );
  }

  /**
   * OWNER/ADMIN rejects the pending request, returning the post to DRAFT.
   * A comment explaining the rejection is required.
   */
  async reject(
    agencyId: string,
    postId: string,
    approvalId: string,
    deciderUserId: string,
    comment: string
  ): Promise<PostFull> {
    if (!comment || comment.trim().length === 0) {
      throw new BadRequestException("A comment is required when rejecting a post");
    }
    return this.decide(
      agencyId,
      postId,
      approvalId,
      deciderUserId,
      ApprovalStatus.REJECTED,
      comment
    );
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async decide(
    agencyId: string,
    postId: string,
    approvalId: string,
    deciderUserId: string,
    decision: ApprovalStatus,
    comment?: string
  ): Promise<PostFull> {
    const post = await this.assertPost(agencyId, postId);

    if (post.status !== PostStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Post '${postId}' is not awaiting approval (status: '${post.status}')`
      );
    }

    const approval = await this.prisma.postApproval.findFirst({
      where: { id: approvalId, postId },
    });

    if (!approval) {
      throw new NotFoundException(
        `Approval '${approvalId}' not found on post '${postId}'`
      );
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException("This approval has already been decided");
    }

    await this.prisma.$transaction([
      this.prisma.postApproval.update({
        where: { id: approvalId },
        data: {
          status: decision,
          approvedBy: deciderUserId,
          approvedAt: new Date(),
          ...(comment !== undefined ? { comment } : {}),
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.DRAFT },
      }),
    ]);

    await this.notifyRequester(agencyId, post, approval.requestedBy, decision, comment);

    this.logger.log(
      `Approval ${decision}: post=${postId} approval=${approvalId} by=${deciderUserId}`
    );

    return this.postService.findOne(agencyId, postId);
  }

  private async assertPost(agencyId: string, postId: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, agencyId },
    });
    if (!post) {
      throw new NotFoundException(`Post '${postId}' not found in this agency`);
    }
    return post;
  }

  private postLabel(post: Post): string {
    return post.title && post.title.trim().length > 0 ? post.title : "Untitled post";
  }

  /** Notify all OWNER/ADMIN members (except the requester) that a post needs review. */
  private async notifyApprovers(
    agencyId: string,
    post: Post,
    requesterUserId: string
  ): Promise<void> {
    try {
      const approvers = await this.prisma.agencyMember.findMany({
        where: {
          agencyId,
          role: { in: [UserRole.OWNER, UserRole.ADMIN] },
          userId: { not: requesterUserId },
        },
        select: { userId: true },
      });

      await Promise.all(
        approvers.map((a) =>
          this.notifications.create({
            agencyId,
            userId: a.userId,
            type: "APPROVAL_REQUESTED",
            title: "A post needs your approval",
            body: `"${this.postLabel(post)}" was submitted for review.`,
            data: { postId: post.id },
          })
        )
      );
    } catch (err) {
      this.logger.warn(`Failed to notify approvers for post ${post.id}: ${String(err)}`);
    }
  }

  /** Notify the original requester of the approval decision. */
  private async notifyRequester(
    agencyId: string,
    post: Post,
    requesterUserId: string,
    decision: ApprovalStatus,
    comment?: string
  ): Promise<void> {
    try {
      const approved = decision === ApprovalStatus.APPROVED;
      await this.notifications.create({
        agencyId,
        userId: requesterUserId,
        type: "APPROVAL_DECISION",
        title: approved ? "Your post was approved" : "Your post was rejected",
        body: approved
          ? `"${this.postLabel(post)}" is approved and ready to schedule.`
          : `"${this.postLabel(post)}" was rejected${comment ? `: ${comment}` : "."}`,
        data: { postId: post.id, decision },
      });
    } catch (err) {
      this.logger.warn(`Failed to notify requester for post ${post.id}: ${String(err)}`);
    }
  }
}
