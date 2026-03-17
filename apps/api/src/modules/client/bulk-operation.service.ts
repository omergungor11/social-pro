import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@social-pro/prisma";
import { PrismaService } from "../common/prisma/prisma.service";
import { BulkAction, BulkOperationDto } from "./dto/bulk-operation.dto";

const MAX_BULK_CLIENTS = 500;

export interface BulkOperationResult {
  successCount: number;
  failedCount: number;
  errors: string[];
}

@Injectable()
export class BulkOperationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes a bulk action on up to 500 clients belonging to the given agency.
   * The entire operation runs inside a single transaction so that partial
   * failures are rolled back atomically.
   *
   * Supported actions:
   *   - delete            — soft-delete all matched clients
   *   - add-to-group      — add clients to a group (requires data.groupId)
   *   - remove-from-group — remove clients from a group (requires data.groupId)
   *   - add-tags          — append tags to clients, deduplicating existing ones
   *   - remove-tags       — remove specific tags from clients (requires data.tags)
   */
  async executeBulk(
    agencyId: string,
    dto: BulkOperationDto
  ): Promise<BulkOperationResult> {
    if (dto.clientIds.length > MAX_BULK_CLIENTS) {
      throw new BadRequestException(
        `Bulk operations are limited to ${MAX_BULK_CLIENTS} clients per request`
      );
    }

    // Resolve only valid, non-deleted clients that belong to this agency.
    const validClients = await this.prisma.client.findMany({
      where: {
        id: { in: dto.clientIds },
        agencyId,
        deletedAt: null,
      },
      select: { id: true, tags: true },
    });

    const validIds = validClients.map((c) => c.id);
    const failedCount = dto.clientIds.length - validIds.length;
    const errors: string[] = [];

    if (failedCount > 0) {
      const validSet = new Set(validIds);
      const invalid = dto.clientIds.filter((id) => !validSet.has(id));
      errors.push(
        `${failedCount} client(s) not found or not accessible: ${invalid.join(", ")}`
      );
    }

    if (validIds.length === 0) {
      return { successCount: 0, failedCount, errors };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        switch (dto.action) {
          case BulkAction.DELETE:
            await this.bulkDelete(tx, validIds);
            break;

          case BulkAction.ADD_TO_GROUP:
            await this.bulkAddToGroup(tx, agencyId, validIds, dto);
            break;

          case BulkAction.REMOVE_FROM_GROUP:
            await this.bulkRemoveFromGroup(tx, agencyId, validIds, dto);
            break;

          case BulkAction.ADD_TAGS:
            await this.bulkAddTags(tx, agencyId, validClients, dto);
            break;

          case BulkAction.REMOVE_TAGS:
            await this.bulkRemoveTags(tx, agencyId, validClients, dto);
            break;

          default: {
            const exhaustiveCheck: never = dto.action;
            throw new BadRequestException(
              `Unsupported bulk action: ${String(exhaustiveCheck)}`
            );
          }
        }
      });
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Transaction failed: ${message}`);
      return { successCount: 0, failedCount: dto.clientIds.length, errors };
    }

    return { successCount: validIds.length, failedCount, errors };
  }

  // ---------------------------------------------------------------------------
  // Private helpers — each operates inside the provided transaction
  // ---------------------------------------------------------------------------

  private async bulkDelete(
    tx: Prisma.TransactionClient,
    clientIds: string[]
  ): Promise<void> {
    await tx.client.updateMany({
      where: { id: { in: clientIds } },
      data: { deletedAt: new Date() },
    });
  }

  private async bulkAddToGroup(
    tx: Prisma.TransactionClient,
    agencyId: string,
    clientIds: string[],
    dto: BulkOperationDto
  ): Promise<void> {
    const groupId = dto.data?.groupId;

    if (!groupId) {
      throw new BadRequestException(
        "data.groupId is required for the add-to-group action"
      );
    }

    // Verify the group belongs to the agency.
    const group = await tx.clientGroup.findFirst({
      where: { id: groupId, agencyId },
      select: { id: true },
    });

    if (!group) {
      throw new BadRequestException(
        `Client group '${groupId}' not found in this agency`
      );
    }

    await tx.clientGroupMembership.createMany({
      data: clientIds.map((clientId) => ({ clientId, groupId })),
      skipDuplicates: true,
    });
  }

  private async bulkRemoveFromGroup(
    tx: Prisma.TransactionClient,
    agencyId: string,
    clientIds: string[],
    dto: BulkOperationDto
  ): Promise<void> {
    const groupId = dto.data?.groupId;

    if (!groupId) {
      throw new BadRequestException(
        "data.groupId is required for the remove-from-group action"
      );
    }

    // Verify the group belongs to the agency.
    const group = await tx.clientGroup.findFirst({
      where: { id: groupId, agencyId },
      select: { id: true },
    });

    if (!group) {
      throw new BadRequestException(
        `Client group '${groupId}' not found in this agency`
      );
    }

    await tx.clientGroupMembership.deleteMany({
      where: { groupId, clientId: { in: clientIds } },
    });
  }

  private async bulkAddTags(
    tx: Prisma.TransactionClient,
    _agencyId: string,
    validClients: { id: string; tags: string[] }[],
    dto: BulkOperationDto
  ): Promise<void> {
    const newTags = dto.data?.tags;

    if (!newTags || newTags.length === 0) {
      throw new BadRequestException(
        "data.tags is required for the add-tags action"
      );
    }

    // Update each client individually to merge tags without duplicates.
    await Promise.all(
      validClients.map((client) => {
        const merged = Array.from(new Set([...client.tags, ...newTags]));

        return tx.client.update({
          where: { id: client.id },
          data: { tags: merged },
        });
      })
    );
  }

  private async bulkRemoveTags(
    tx: Prisma.TransactionClient,
    _agencyId: string,
    validClients: { id: string; tags: string[] }[],
    dto: BulkOperationDto
  ): Promise<void> {
    const tagsToRemove = dto.data?.tags;

    if (!tagsToRemove || tagsToRemove.length === 0) {
      throw new BadRequestException(
        "data.tags is required for the remove-tags action"
      );
    }

    const removeSet = new Set(tagsToRemove);

    await Promise.all(
      validClients.map((client) => {
        const filtered = client.tags.filter((t) => !removeSet.has(t));

        return tx.client.update({
          where: { id: client.id },
          data: { tags: filtered },
        });
      })
    );
  }
}
