import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WorkflowProcess } from './workflow-process.entity';

@Entity('enterprise_workflow_steps')
@Index(['processId', 'stepOrder'])
export class WorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  processId: string;

  @ManyToOne(() => WorkflowProcess, (process) => process.steps, { onDelete: 'CASCADE' })
  process: WorkflowProcess;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({ type: 'varchar', length: 120 })
  stepName: string;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status: 'pending' | 'active' | 'done' | 'skipped';

  @Column({ type: 'varchar', length: 120, nullable: true })
  actor: string | null;

  @Column({ type: 'timestamp', nullable: true })
  actedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
