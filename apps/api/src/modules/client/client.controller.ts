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
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Client } from "@social-pro/prisma";
import { PaginatedResponseDto } from "../common/dto/pagination.dto";
import { CurrentAgency } from "../common/decorators/current-agency.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { ClientService, ClientWithRelations } from "./client.service";
import { BulkOperationService, BulkOperationResult } from "./bulk-operation.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientListQueryDto } from "./dto/client-list-query.dto";
import { BulkOperationDto } from "./dto/bulk-operation.dto";

@ApiTags("Clients")
@ApiBearerAuth()
@Controller("clients")
@UseGuards(RolesGuard)
export class ClientController {
  constructor(
    private readonly clientService: ClientService,
    private readonly bulkOperationService: BulkOperationService
  ) {}

  // ---------------------------------------------------------------------------
  // Bulk — declared before :id routes to avoid routing ambiguity
  // ---------------------------------------------------------------------------

  @Post("bulk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Execute a bulk operation on multiple clients",
    description:
      "Performs one of: delete, add-to-group, remove-from-group, add-tags, remove-tags. " +
      "Maximum 500 clients per request. Uses a single DB transaction.",
  })
  @ApiResponse({ status: 200, description: "Bulk operation completed" })
  @ApiResponse({ status: 400, description: "Invalid action or missing required data" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async bulk(
    @CurrentAgency() agencyId: string,
    @Body() dto: BulkOperationDto
  ): Promise<BulkOperationResult> {
    return this.bulkOperationService.executeBulk(agencyId, dto);
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: "List clients",
    description:
      "Returns a paginated list of non-deleted clients. Supports free-text search " +
      "(name, email, company), tag filtering, group filtering, and sorting.",
  })
  @ApiResponse({ status: 200, description: "Clients retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async list(
    @CurrentAgency() agencyId: string,
    @Query() query: ClientListQueryDto
  ): Promise<PaginatedResponseDto<Client>> {
    return this.clientService.list(agencyId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new client" })
  @ApiResponse({ status: 201, description: "Client created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  async create(
    @CurrentAgency() agencyId: string,
    @Body() dto: CreateClientDto
  ): Promise<Client> {
    return this.clientService.create(agencyId, dto);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get client details",
    description: "Returns the client with its group memberships and social accounts.",
  })
  @ApiParam({ name: "id", description: "Client ID" })
  @ApiResponse({ status: 200, description: "Client retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Client not found" })
  async findOne(
    @CurrentAgency() agencyId: string,
    @Param("id") clientId: string
  ): Promise<ClientWithRelations> {
    return this.clientService.findOne(agencyId, clientId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a client" })
  @ApiParam({ name: "id", description: "Client ID" })
  @ApiResponse({ status: 200, description: "Client updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Client not found" })
  async update(
    @CurrentAgency() agencyId: string,
    @Param("id") clientId: string,
    @Body() dto: UpdateClientDto
  ): Promise<Client> {
    return this.clientService.update(agencyId, clientId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Soft-delete a client",
    description: "Sets deletedAt on the record; the client will no longer appear in list results.",
  })
  @ApiParam({ name: "id", description: "Client ID" })
  @ApiResponse({ status: 204, description: "Client deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthenticated" })
  @ApiResponse({ status: 404, description: "Client not found" })
  async remove(
    @CurrentAgency() agencyId: string,
    @Param("id") clientId: string
  ): Promise<void> {
    return this.clientService.remove(agencyId, clientId);
  }
}
