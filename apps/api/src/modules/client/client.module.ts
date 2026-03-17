import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { ClientController } from "./client.controller";
import { ClientGroupController } from "./client-group.controller";
import { ClientService } from "./client.service";
import { ClientGroupService } from "./client-group.service";
import { BulkOperationService } from "./bulk-operation.service";

@Module({
  imports: [PrismaModule],
  controllers: [ClientController, ClientGroupController],
  providers: [ClientService, ClientGroupService, BulkOperationService],
  exports: [ClientService, ClientGroupService, BulkOperationService],
})
export class ClientModule {}
