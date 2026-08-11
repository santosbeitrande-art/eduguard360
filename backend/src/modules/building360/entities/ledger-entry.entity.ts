import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('building360_ledger_entries')
@Index(['tenantId', 'occurredAt'])
export class BuildingLedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  direction!: 'debit' | 'credit';

  @Column({ type: 'varchar', length: 32 })
  entryType!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 8, default: 'MZN' })
  currency!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  referenceType!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  referenceId!: string | null;

  @Column({ type: 'varchar', length: 600, nullable: true })
  note!: string | null;

  @Column({ type: 'date' })
  occurredAt!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
