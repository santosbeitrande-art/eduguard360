import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_work_orders')
@Index(['tenantId', 'status', 'isActive'])
export class BuildingWorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  assetId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  requestedBy!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority!: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: 'open' | 'in_progress' | 'done' | 'cancelled';

  @Column({ type: 'varchar', length: 600, nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  assignedTo!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
