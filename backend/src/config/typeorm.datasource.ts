import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Listing } from '../modules/listings/entities/listing.entity';
import { Image } from '../modules/listings/entities/image.entity';
import { Reservation } from '../modules/reservations/entities/reservation.entity';
import { Rating } from '../modules/users/entities/rating.entity';
import { AuditLog } from '../modules/enterprise/entities/audit-log.entity';
import { ActiveSession } from '../modules/enterprise/entities/active-session.entity';
import { SecurityPolicy } from '../modules/enterprise/entities/security-policy.entity';
import { MfaEnrollment } from '../modules/enterprise/entities/mfa-enrollment.entity';
import { WorkflowProcess } from '../modules/enterprise/entities/workflow-process.entity';
import { WorkflowStep } from '../modules/enterprise/entities/workflow-step.entity';
import { BuildingOrganization } from '../modules/building360/entities/organization.entity';
import { BuildingPortfolio } from '../modules/building360/entities/portfolio.entity';
import { BuildingSite } from '../modules/building360/entities/site.entity';
import { BuildingBuilding } from '../modules/building360/entities/building.entity';
import { BuildingFloor } from '../modules/building360/entities/floor.entity';
import { BuildingUnit } from '../modules/building360/entities/unit.entity';
import { BuildingPerson } from '../modules/building360/entities/person.entity';
import { BuildingRoleAssignment } from '../modules/building360/entities/role-assignment.entity';
import { BuildingAsset } from '../modules/building360/entities/asset.entity';
import { BuildingWorkOrder } from '../modules/building360/entities/work-order.entity';
import { BuildingContract } from '../modules/building360/entities/contract.entity';
import { BuildingCharge } from '../modules/building360/entities/charge.entity';
import { BuildingInvoice } from '../modules/building360/entities/invoice.entity';
import { BuildingPayment } from '../modules/building360/entities/payment.entity';
import { BuildingReceipt } from '../modules/building360/entities/receipt.entity';
import { BuildingLedgerEntry } from '../modules/building360/entities/ledger-entry.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'ecotrade_app',
  password: process.env.DATABASE_PASSWORD || 'secure_password',
  database: process.env.DATABASE_NAME || 'ecotrade360',
  entities: [
    User,
    Listing,
    Image,
    Reservation,
    Rating,
    AuditLog,
    ActiveSession,
    SecurityPolicy,
    MfaEnrollment,
    WorkflowProcess,
    WorkflowStep,
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
  ],
  // Resolve from current build location to avoid loading src and dist migrations together.
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
