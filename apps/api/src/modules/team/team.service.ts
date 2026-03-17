import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { UserRole } from "@social-pro/shared-types";
import { AgencyMember, Invitation, User } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";

export interface MemberWithUser extends AgencyMember {
  user: Pick<User, "id" | "email" | "name" | "avatarUrl">;
}

const INVITATION_TTL_DAYS = 7;

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all members of the given agency, including basic user information.
   */
  async listMembers(agencyId: string): Promise<MemberWithUser[]> {
    return this.prisma.agencyMember.findMany({
      where: { agencyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }) as Promise<MemberWithUser[]>;
  }

  /**
   * Creates an Invitation record for the given email / role combination.
   * Raises a conflict when a pending (unexpired, unaccepted) invitation for the
   * same agency + email already exists, or when the user is already a member.
   */
  async inviteMember(
    agencyId: string,
    email: string,
    role: UserRole
  ): Promise<Invitation> {
    // Guard: already a member
    const existingMember = await this.prisma.agencyMember.findFirst({
      where: {
        agencyId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        "A member with that email already belongs to this agency"
      );
    }

    // Guard: active invitation already exists
    const now = new Date();
    const activePending = await this.prisma.invitation.findFirst({
      where: {
        agencyId,
        email,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (activePending) {
      throw new ConflictException(
        "A pending invitation for that email already exists"
      );
    }

    const expiresAt = new Date(
      now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    return this.prisma.invitation.create({
      data: {
        agencyId,
        email,
        role,
        token: randomUUID(),
        expiresAt,
      },
    });
  }

  /**
   * Accepts an invitation by token.
   * Finds the matching User by invitation email, creates an AgencyMember record,
   * and marks the invitation as accepted — all inside a single transaction.
   */
  async acceptInvitation(token: string): Promise<AgencyMember> {
    const now = new Date();

    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.acceptedAt !== null) {
      throw new BadRequestException("Invitation has already been accepted");
    }

    if (invitation.expiresAt <= now) {
      throw new BadRequestException("Invitation has expired");
    }

    // The invited user must already have an account registered with that email.
    const user = await this.prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (!user) {
      throw new NotFoundException(
        "No account found for the invitation email. Please register first."
      );
    }

    // Guard against duplicate membership (race condition)
    const existingMember = await this.prisma.agencyMember.findUnique({
      where: {
        agencyId_userId: {
          agencyId: invitation.agencyId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException("User is already a member of this agency");
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.agencyMember.create({
        data: {
          agencyId: invitation.agencyId,
          userId: user.id,
          role: invitation.role,
          invitedAt: invitation.createdAt,
          acceptedAt: now,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: now },
      });

      return member;
    });
  }

  /**
   * Changes the role of a member within an agency.
   * The OWNER role cannot be transferred through this endpoint.
   */
  async changeMemberRole(
    agencyId: string,
    memberId: string,
    newRole: UserRole
  ): Promise<AgencyMember> {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId },
    });

    if (!member) {
      throw new NotFoundException("Member not found in this agency");
    }

    if (member.role === UserRole.OWNER) {
      throw new BadRequestException(
        "The OWNER role cannot be changed. Transfer ownership explicitly."
      );
    }

    if (newRole === UserRole.OWNER) {
      throw new BadRequestException(
        "Cannot assign the OWNER role through this endpoint"
      );
    }

    return this.prisma.agencyMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });
  }

  /**
   * Removes a member from an agency.
   * The last OWNER cannot be removed.
   */
  async removeMember(agencyId: string, memberId: string): Promise<void> {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId },
    });

    if (!member) {
      throw new NotFoundException("Member not found in this agency");
    }

    if (member.role === UserRole.OWNER) {
      const ownerCount = await this.prisma.agencyMember.count({
        where: { agencyId, role: UserRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          "Cannot remove the last owner of the agency"
        );
      }
    }

    await this.prisma.agencyMember.delete({ where: { id: memberId } });
  }

  /**
   * Returns all invitations for the agency that are still pending:
   * not yet accepted and not yet expired.
   */
  async listPendingInvitations(agencyId: string): Promise<Invitation[]> {
    return this.prisma.invitation.findMany({
      where: {
        agencyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Deletes a pending invitation by id, scoped to the agency.
   */
  async cancelInvitation(
    agencyId: string,
    invitationId: string
  ): Promise<void> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, agencyId },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found in this agency");
    }

    await this.prisma.invitation.delete({ where: { id: invitationId } });
  }
}
