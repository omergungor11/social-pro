import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ClientGroup } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";

export interface ClientGroupWithCount extends ClientGroup {
  _count: { memberships: number };
}

@Injectable()
export class ClientGroupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all groups for the agency, each annotated with the number of
   * member clients.
   */
  async listGroups(agencyId: string): Promise<ClientGroupWithCount[]> {
    return this.prisma.clientGroup.findMany({
      where: { agencyId },
      include: {
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: "asc" },
    }) as Promise<ClientGroupWithCount[]>;
  }

  /**
   * Creates a new client group under the given agency.
   */
  async createGroup(agencyId: string, dto: CreateGroupDto): Promise<ClientGroup> {
    return this.prisma.clientGroup.create({
      data: {
        agencyId,
        name: dto.name,
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /**
   * Partially updates a client group. Throws when the group is not found.
   */
  async updateGroup(
    agencyId: string,
    groupId: string,
    dto: UpdateGroupDto
  ): Promise<ClientGroup> {
    await this.assertGroupExists(agencyId, groupId);

    return this.prisma.clientGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /**
   * Deletes a client group. Associated memberships are removed via cascade.
   * Throws when the group is not found.
   */
  async removeGroup(agencyId: string, groupId: string): Promise<void> {
    await this.assertGroupExists(agencyId, groupId);

    await this.prisma.clientGroup.delete({ where: { id: groupId } });
  }

  /**
   * Adds a set of clients to a group, silently skipping any that are already
   * members (skipDuplicates). Only clients that belong to the same agency are
   * added.
   */
  async addMembers(
    agencyId: string,
    groupId: string,
    clientIds: string[]
  ): Promise<void> {
    await this.assertGroupExists(agencyId, groupId);

    // Verify all provided clients exist and belong to the same agency.
    const validClients = await this.prisma.client.findMany({
      where: { id: { in: clientIds }, agencyId, deletedAt: null },
      select: { id: true },
    });

    const validIds = validClients.map((c) => c.id);

    await this.prisma.clientGroupMembership.createMany({
      data: validIds.map((clientId) => ({ clientId, groupId })),
      skipDuplicates: true,
    });
  }

  /**
   * Removes a set of clients from a group. Silently ignores IDs that are not
   * currently members.
   */
  async removeMembers(
    agencyId: string,
    groupId: string,
    clientIds: string[]
  ): Promise<void> {
    await this.assertGroupExists(agencyId, groupId);

    await this.prisma.clientGroupMembership.deleteMany({
      where: {
        groupId,
        clientId: { in: clientIds },
      },
    });
  }

  /**
   * Asserts that a group exists within the agency.
   * Throws NotFoundException otherwise.
   */
  async assertGroupExists(agencyId: string, groupId: string): Promise<void> {
    const exists = await this.prisma.clientGroup.findFirst({
      where: { id: groupId, agencyId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(
        `Client group '${groupId}' not found in this agency`
      );
    }
  }
}
