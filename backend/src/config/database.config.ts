import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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

export const DatabaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
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
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  cache: true,
};
