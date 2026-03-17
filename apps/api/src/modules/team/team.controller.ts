import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AgencyMember, Invitation } from "@social-pro/prisma";
import { UserRole } from "@social-pro/shared-types";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { TeamService, MemberWithUser } from "./team.service";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { ChangeRoleDto } from "./dto/change-role.dto";

@ApiTags("Team")
@ApiBearerAuth()
@Controller("team")
@UseGuards(RolesGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------

  @Get("members")
  @ApiOperation({ summary: "List all agency members" })
  @ApiResponse({ status: 200, description: "Members retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async listMembers(
    @CurrentAgency() agencyId: string
  ): Promise<MemberWithUser[]> {
    return this.teamService.listMembers(agencyId);
  }

  @Patch("members/:id/role")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Change the role of a team member" })
  @ApiParam({ name: "id", description: "AgencyMember id" })
  @ApiResponse({ status: 200, description: "Role updated successfully" })
  @ApiResponse({ status: 400, description: "Invalid role change" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Member not found" })
  async changeMemberRole(
    @CurrentAgency() agencyId: string,
    @Param("id") memberId: string,
    @Body() dto: ChangeRoleDto
  ): Promise<AgencyMember> {
    return this.teamService.changeMemberRole(agencyId, memberId, dto.role);
  }

  @Delete("members/:id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a member from the agency" })
  @ApiParam({ name: "id", description: "AgencyMember id" })
  @ApiResponse({ status: 204, description: "Member removed successfully" })
  @ApiResponse({ status: 400, description: "Cannot remove last owner" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Member not found" })
  async removeMember(
    @CurrentAgency() agencyId: string,
    @Param("id") memberId: string
  ): Promise<void> {
    return this.teamService.removeMember(agencyId, memberId);
  }

  // -------------------------------------------------------------------------
  // Invitations
  // -------------------------------------------------------------------------

  @Post("invite")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Invite a new member to the agency" })
  @ApiResponse({ status: 201, description: "Invitation created successfully" })
  @ApiResponse({ status: 409, description: "Pending invitation or member already exists" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  async inviteMember(
    @CurrentAgency() agencyId: string,
    @CurrentUser() _user: AuthenticatedUser,
    @Body() dto: InviteMemberDto
  ): Promise<Invitation> {
    return this.teamService.inviteMember(agencyId, dto.email, dto.role);
  }

  @Post("invitations/:token/accept")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accept an invitation by token (public endpoint)" })
  @ApiParam({ name: "token", description: "Invitation token (UUID)" })
  @ApiResponse({ status: 200, description: "Invitation accepted, membership created" })
  @ApiResponse({ status: 400, description: "Invitation already accepted or expired" })
  @ApiResponse({ status: 404, description: "Invitation or user account not found" })
  async acceptInvitation(
    @Param("token") token: string
  ): Promise<AgencyMember> {
    return this.teamService.acceptInvitation(token);
  }

  @Get("invitations")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "List pending (unexpired, unaccepted) invitations" })
  @ApiResponse({ status: 200, description: "Pending invitations retrieved" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  async listPendingInvitations(
    @CurrentAgency() agencyId: string
  ): Promise<Invitation[]> {
    return this.teamService.listPendingInvitations(agencyId);
  }

  @Delete("invitations/:id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cancel a pending invitation" })
  @ApiParam({ name: "id", description: "Invitation id" })
  @ApiResponse({ status: 204, description: "Invitation cancelled" })
  @ApiResponse({ status: 403, description: "Insufficient permissions" })
  @ApiResponse({ status: 404, description: "Invitation not found" })
  async cancelInvitation(
    @CurrentAgency() agencyId: string,
    @Param("id") invitationId: string
  ): Promise<void> {
    return this.teamService.cancelInvitation(agencyId, invitationId);
  }
}
