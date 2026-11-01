import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_demo_requests')
@Index(['status', 'createdAt'])
@Index(['email', 'status'])
export class Building360DemoRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 160 })
  organizationName!: string;

  @Column({ type: 'varchar', length: 180 })
  email!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 160 })
  buildingName!: string;

  @Column({ type: 'varchar', length: 24 })
  plan!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  siteId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  buildingId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  invitedUserId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  reviewedBy!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  privacyConsentAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  provisioningError!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
