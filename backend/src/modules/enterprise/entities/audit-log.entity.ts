import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('enterprise_audit_logs')
@Index(['actorId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['schoolId'])
@Index(['tenantId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actorRole!: string | null;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'varchar', length: 80 })
  resourceType!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  resourceId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'info' })
  severity!: 'info' | 'warn' | 'error';

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'varchar', length: 80, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
