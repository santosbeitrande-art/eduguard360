import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_payments')
@Index(['tenantId', 'status', 'isActive'])
export class BuildingPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'MZN' })
  currency!: string;

  @Column({ type: 'varchar', length: 24, default: 'bank_transfer' })
  method!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  reference!: string | null;

  @Column({ type: 'date' })
  paidAt!: string;

  @Column({ type: 'varchar', length: 24, default: 'confirmed' })
  status!: 'pending' | 'confirmed' | 'failed' | 'reversed';

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
