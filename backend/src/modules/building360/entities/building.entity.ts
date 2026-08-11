import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_buildings')
@Index(['tenantId', 'siteId', 'isActive'])
export class BuildingBuilding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  organizationId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  portfolioId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  siteId!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  code!: string | null;

  @Column({ type: 'int', default: 1 })
  floors!: number;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
