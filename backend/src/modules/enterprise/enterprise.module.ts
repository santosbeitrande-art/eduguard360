import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnterpriseController } from './enterprise.controller';
import { EnterpriseService } from './enterprise.service';
import { AuditLog } from './entities/audit-log.entity';
import { ActiveSession } from './entities/active-session.entity';
import { SecurityPolicy } from './entities/security-policy.entity';
import { MfaEnrollment } from './entities/mfa-enrollment.entity';
import { WorkflowProcess } from './entities/workflow-process.entity';
import { WorkflowStep } from './entities/workflow-step.entity';
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';
import { User } from '../users/entities/user.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, ActiveSession, SecurityPolicy, MfaEnrollment, WorkflowProcess, WorkflowStep, User, Listing, Reservation])],
  controllers: [EnterpriseController],
  providers: [EnterpriseService, EnterpriseRbacGuard],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
