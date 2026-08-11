import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_units')
@Index(['tenantId', 'buildingId', 'isActive'])
export class BuildingUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  buildingId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  siteId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  floorId!: string | null;

  @Column({ type: 'varchar', length: 40 })
  number!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'office' })
  type!: string;

  @Column({ type: 'varchar', length: 32, default: 'vacant' })
  status!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  areaM2!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
