import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building360Controller } from './building360.controller';
import { Building360Service } from './building360.service';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
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

@Module({
  imports: [
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
      AuditLog,
    ]),
  ],
  controllers: [Building360Controller],
  providers: [Building360Service, EnterpriseRbacGuard],
  exports: [Building360Service],
})
export class Building360Module {}
