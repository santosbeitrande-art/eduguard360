import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('enterprise_active_sessions')
@Index(['userId', 'status'])
@Index(['schoolId'])
@Index(['tenantId'])
export class ActiveSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  userName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  userRole!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  device!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  browser!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: 'active' | 'revoked' | 'expired';

  @Column({ type: 'boolean', default: false })
  trusted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
