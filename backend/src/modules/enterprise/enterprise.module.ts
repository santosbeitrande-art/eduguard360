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

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, ActiveSession, SecurityPolicy, MfaEnrollment, WorkflowProcess, WorkflowStep])],
  controllers: [EnterpriseController],
  providers: [EnterpriseService],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
