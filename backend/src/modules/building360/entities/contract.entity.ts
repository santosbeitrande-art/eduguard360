import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_contracts')
@Index(['tenantId', 'status', 'isActive'])
export class BuildingContract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  siteId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  buildingId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  unitId!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 24, default: 'monthly' })
  billingCycle!: 'monthly' | 'quarterly' | 'annual';

  @Column({ type: 'varchar', length: 8, default: 'MZN' })
  currency!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'date' })
  startsAt!: string;

  @Column({ type: 'date', nullable: true })
  endsAt!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
