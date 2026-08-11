import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('building360_role_assignments')
@Index(['tenantId', 'personId', 'role', 'isActive'])
export class BuildingRoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  personId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  organizationId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  siteId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  buildingId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  unitId!: string | null;

  @Column({ type: 'varchar', length: 48 })
  role!: string;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
