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
import { ClientGroup } from "@social-pro/prisma";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { ClientGroupService, ClientGroupWithCount } from "./client-group.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupMembersDto } from "./dto/group-members.dto";

@ApiTags("Client Groups")
@ApiBearerAuth()
@Controller("clients/groups")
@UseGuards(RolesGuard)
export class ClientGroupController {
  constructor(private readonly clientGroupService: ClientGroupService) {}

  @Get()
  @ApiOperation({
    summary: "List all client groups",
    description: "Returns all groups for the agency, each with a member count.",
  })
  @ApiResponse({ status: 200, description: "Groups retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async listGroups(
    @CurrentAgency() agencyId: string
  ): Promise<ClientGroupWithCount[]> {
    return this.clientGroupService.listGroups(agencyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new client group" })
  @ApiResponse({ status: 201, description: "Group created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async createGroup(
    @CurrentAgency() agencyId: string,
    @Body() dto: CreateGroupDto
  ): Promise<ClientGroup> {
    return this.clientGroupService.createGroup(agencyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a client group" })
  @ApiParam({ name: "id", description: "Client group ID" })
  @ApiResponse({ status: 200, description: "Group updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Group not found" })
  async updateGroup(
    @CurrentAgency() agencyId: string,
    @Param("id") groupId: string,
    @Body() dto: UpdateGroupDto
  ): Promise<ClientGroup> {
    return this.clientGroupService.updateGroup(agencyId, groupId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a client group",
    description: "Deletes the group; all memberships are removed via cascade.",
  })
  @ApiParam({ name: "id", description: "Client group ID" })
  @ApiResponse({ status: 204, description: "Group deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Group not found" })
  async removeGroup(
    @CurrentAgency() agencyId: string,
    @Param("id") groupId: string
  ): Promise<void> {
    return this.clientGroupService.removeGroup(agencyId, groupId);
  }

  @Post(":id/members")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Add clients to a group",
    description: "Adds up to 500 clients to the group, skipping duplicates. " +
      "Only clients belonging to the same agency are considered.",
  })
  @ApiParam({ name: "id", description: "Client group ID" })
  @ApiResponse({ status: 200, description: "Members added successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Group not found" })
  async addMembers(
    @CurrentAgency() agencyId: string,
    @Param("id") groupId: string,
    @Body() dto: GroupMembersDto
  ): Promise<void> {
    return this.clientGroupService.addMembers(agencyId, groupId, dto.clientIds);
  }

  @Delete(":id/members")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Remove clients from a group",
    description: "Removes the specified clients from the group. " +
      "Client IDs that are not members are silently ignored.",
  })
  @ApiParam({ name: "id", description: "Client group ID" })
  @ApiResponse({ status: 200, description: "Members removed successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Group not found" })
  async removeMembers(
    @CurrentAgency() agencyId: string,
    @Param("id") groupId: string,
    @Body() dto: GroupMembersDto
  ): Promise<void> {
    return this.clientGroupService.removeMembers(agencyId, groupId, dto.clientIds);
  }
}
