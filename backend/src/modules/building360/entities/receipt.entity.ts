import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_receipts')
@Index(['tenantId', 'isActive'])
export class BuildingReceipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  receiptNumber!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'MZN' })
  currency!: string;

  @Column({ type: 'date' })
  issuedAt!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
