import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('enterprise_security_policies')
@Index(['key'], { unique: true })
export class SecurityPolicy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'jsonb', default: {} })
  value!: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
