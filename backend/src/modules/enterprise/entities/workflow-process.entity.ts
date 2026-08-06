import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { WorkflowStep } from './workflow-step.entity';

@Entity('enterprise_workflow_processes')
@Index(['status', 'priority'])
export class WorkflowProcess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'varchar', length: 64 })
  type!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  requester!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  owner!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';

  @Column({ type: 'varchar', length: 24, default: 'medium' })
  priority!: 'low' | 'medium' | 'high';

  @Column({ type: 'int', default: 0 })
  currentStep!: number;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, any>;

  @OneToMany(() => WorkflowStep, (step: WorkflowStep) => step.process, { cascade: true })
  steps!: WorkflowStep[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
