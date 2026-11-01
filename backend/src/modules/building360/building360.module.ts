import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building360Controller } from './building360.controller';
import { Building360PublicController } from './building360.public.controller';
import { Building360DemoRequestPublicController } from './building360-demo-request.controller';
import { Building360DemoRequestAdminController } from './building360-demo-request-admin.controller';
import { Building360Service } from './building360.service';
import { Building360DemoRequestService } from './building360-demo-request.service';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BuildingOrganization } from './entities/organization.entity';
import { BuildingPortfolio } from './entities/portfolio.entity';
import { BuildingSite } from './entities/site.entity';
import { BuildingBuilding } from './entities/building.entity';
import { BuildingFloor } from './entities/floor.entity';
import { BuildingUnit } from './entities/unit.entity';
import { BuildingPerson } from './entities/person.entity';
import { BuildingRoleAssignment } from './entities/role-assignment.entity';
import { BuildingAsset } from './entities/asset.entity';
import { BuildingWorkOrder } from './entities/work-order.entity';
import { BuildingContract } from './entities/contract.entity';
import { BuildingCharge } from './entities/charge.entity';
import { BuildingInvoice } from './entities/invoice.entity';
import { BuildingPayment } from './entities/payment.entity';
import { BuildingReceipt } from './entities/receipt.entity';
import { BuildingLedgerEntry } from './entities/ledger-entry.entity';
import { AuditLog } from '../enterprise/entities/audit-log.entity';
import { Building360DemoRequest } from './entities/demo-request.entity';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    TypeOrmModule.forFeature([
      BuildingOrganization,
      BuildingPortfolio,
      BuildingSite,
      BuildingBuilding,
      BuildingFloor,
      BuildingUnit,
      BuildingPerson,
      BuildingRoleAssignment,
      BuildingAsset,
      BuildingWorkOrder,
      BuildingContract,
      BuildingCharge,
      BuildingInvoice,
      BuildingPayment,
      BuildingReceipt,
      BuildingLedgerEntry,
      Building360DemoRequest,
      AuditLog,
    ]),
  ],
  controllers: [
    Building360Controller,
    Building360PublicController,
    Building360DemoRequestPublicController,
    Building360DemoRequestAdminController,
  ],
  providers: [Building360Service, Building360DemoRequestService, EnterpriseRbacGuard, JwtAuthGuard],
  exports: [Building360Service],
})
export class Building360Module {}
