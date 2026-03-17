import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Client, ClientGroupMembership, SocialAccount } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { PaginatedResponseDto } from "../common/dto/pagination.dto";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientListQueryDto, ClientSortBy, SortOrder } from "./dto/client-list-query.dto";

export interface ClientWithRelations extends Client {
  groupMemberships: (ClientGroupMembership & {
    group: { id: string; name: string; color: string };
  })[];
  socialAccounts: Pick<
    SocialAccount,
    "id" | "platform" | "platformUsername" | "displayName" | "avatarUrl" | "isActive"
  >[];
}

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns a paginated, filtered, and sorted list of clients scoped to the
   * given agency. Only non-deleted clients are included.
   */
  async list(
    agencyId: string,
    query: ClientListQueryDto
  ): Promise<PaginatedResponseDto<Client>> {
    const {
      page,
      limit,
      search,
      tags,
      groupId,
      sortBy = ClientSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const skip = (page - 1) * limit;

    const where = {
      agencyId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(tags && tags.length > 0 ? { tags: { hasEvery: tags } } : {}),
      ...(groupId
        ? {
            groupMemberships: {
              some: { groupId },
            },
          }
        : {}),
    };

    const [clients, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.client.count({ where }),
    ]);

    return PaginatedResponseDto.of(clients, total, page, limit);
  }

  /**
   * Creates a new client record under the given agency.
   */
  async create(agencyId: string, dto: CreateClientDto): Promise<Client> {
    return this.prisma.client.create({
      data: {
        agencyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        notes: dto.notes,
        tags: dto.tags ?? [],
      },
    });
  }

  /**
   * Returns a single non-deleted client with its group memberships and social
   * accounts. Throws NotFoundException when the client does not exist or does
   * not belong to the agency.
   */
  async findOne(agencyId: string, clientId: string): Promise<ClientWithRelations> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, agencyId, deletedAt: null },
      include: {
        groupMemberships: {
          include: {
            group: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        socialAccounts: {
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
    });

    if (!client) {
      throw new NotFoundException(
        `Client '${clientId}' not found in this agency`
      );
    }

    return client as ClientWithRelations;
  }

  /**
   * Partially updates a client record. Throws when the client is not found.
   */
  async update(
    agencyId: string,
    clientId: string,
    dto: UpdateClientDto
  ): Promise<Client> {
    await this.assertExists(agencyId, clientId);

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  /**
   * Soft-deletes a client by setting deletedAt to the current timestamp.
   * Throws when the client is not found.
   */
  async remove(agencyId: string, clientId: string): Promise<void> {
    await this.assertExists(agencyId, clientId);

    await this.prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Asserts that a non-deleted client exists within the agency.
   * Throws NotFoundException otherwise.
   */
  async assertExists(agencyId: string, clientId: string): Promise<void> {
    const exists = await this.prisma.client.findFirst({
      where: { id: clientId, agencyId, deletedAt: null },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(
        `Client '${clientId}' not found in this agency`
      );
    }
  }
}
