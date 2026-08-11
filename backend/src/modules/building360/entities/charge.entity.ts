import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_charges')
@Index(['tenantId', 'status', 'isActive'])
export class BuildingCharge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'uuid' })
  contractId!: string;

  @Column({ type: 'uuid', nullable: true })
  unitId!: string | null;

  @Column({ type: 'varchar', length: 7 })
  period!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: 'pending' | 'invoiced' | 'cancelled';

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
