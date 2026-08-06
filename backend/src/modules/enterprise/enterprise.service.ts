import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ActiveSession } from './entities/active-session.entity';
import { SecurityPolicy } from './entities/security-policy.entity';
import { MfaEnrollment } from './entities/mfa-enrollment.entity';
import { WorkflowProcess } from './entities/workflow-process.entity';
import { WorkflowStep } from './entities/workflow-step.entity';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(ActiveSession)
    private readonly sessionRepository: Repository<ActiveSession>,
    @InjectRepository(SecurityPolicy)
    private readonly policyRepository: Repository<SecurityPolicy>,
    @InjectRepository(MfaEnrollment)
    private readonly mfaRepository: Repository<MfaEnrollment>,
    @InjectRepository(WorkflowProcess)
    private readonly workflowRepository: Repository<WorkflowProcess>,
    @InjectRepository(WorkflowStep)
    private readonly stepRepository: Repository<WorkflowStep>,
  ) {}

  private async ensureDefaults(): Promise<void> {
    const defaults = [
      {
        key: 'mfa.requiredForRoles',
        label: 'Perfis com MFA obrigatório',
        value: { roles: ['admin', 'director', 'financeiro'] },
        description: 'Perfis críticos obrigados a usar MFA.',
      },
      {
        key: 'session.maxAgeMinutes',
        label: 'Expiração de sessão',
        value: { minutes: 120 },
        description: 'Tempo máximo de sessão antes de renovação.',
      },
      {
        key: 'password.policy',
        label: 'Política de senha',
        value: { minLength: 10, upper: true, lower: true, digits: true, symbols: true },
        description: 'Regras mínimas de complexidade da senha.',
      },
      {
        key: 'trustedDevices.enabled',
        label: 'Dispositivos confiáveis',
        value: { enabled: true, ttlDays: 30 },
        description: 'Permite lembrar dispositivos verificados.',
      },
    ];

    for (const policy of defaults) {
      const found = await this.policyRepository.findOne({ where: { key: policy.key } });
      if (!found) {
        const created = this.policyRepository.create({
          ...policy,
          updatedBy: 'system',
        });
        await this.policyRepository.save(created);
      }
    }

    const workflowsCount = await this.workflowRepository.count();
    if (workflowsCount === 0) {
      await this.createWorkflow({
        title: 'Matrícula de aluno - processo inicial',
        type: 'matricula',
        requester: 'Portal dos Pais',
        owner: 'Secretaria',
        priority: 'high',
        steps: ['Pedido', 'Secretaria', 'Direção', 'Financeiro', 'Concluído'],
      });

      await this.createWorkflow({
        title: 'Declaração escolar - emissão',
        type: 'declaracao',
        requester: 'Encarregado',
        owner: 'Direção',
        priority: 'medium',
        steps: ['Pedido', 'Secretaria', 'Direção', 'Concluído'],
      });
    }
  }

  async listAuditLogs(query: { limit?: number; actorId?: string; action?: string }) {
    await this.ensureDefaults();
    const qb = this.auditRepository.createQueryBuilder('audit').orderBy('audit.createdAt', 'DESC');

    if (query.actorId) qb.andWhere('audit.actorId = :actorId', { actorId: query.actorId });
    if (query.action) qb.andWhere('audit.action = :action', { action: query.action });
    qb.take(Math.min(query.limit || 50, 200));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createAuditLog(payload: Partial<AuditLog>) {
    const log = this.auditRepository.create({
      actorId: payload.actorId || null,
      actorName: payload.actorName || null,
      actorRole: payload.actorRole || null,
      action: payload.action || 'unknown_action',
      resourceType: payload.resourceType || 'unknown_resource',
      resourceId: payload.resourceId || null,
      severity: payload.severity || 'info',
      metadata: payload.metadata || {},
      ipAddress: payload.ipAddress || null,
      userAgent: payload.userAgent || null,
    });
    return this.auditRepository.save(log);
  }

  async listSessions(query: { userId?: string; status?: string }) {
    await this.ensureDefaults();
    const qb = this.sessionRepository.createQueryBuilder('session').orderBy('session.lastSeenAt', 'DESC');
    if (query.userId) qb.andWhere('session.userId = :userId', { userId: query.userId });
    if (query.status) qb.andWhere('session.status = :status', { status: query.status });

    const sessions = await qb.getMany();
    return {
      data: sessions,
      total: sessions.length,
      active: sessions.filter((item) => item.status === 'active').length,
    };
  }

  async upsertSession(payload: Partial<ActiveSession> & { userId: string; userName: string }) {
    const sessionId = payload.id || null;
    let session: ActiveSession | null = null;

    if (sessionId) {
      session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    }

    if (!session) {
      session = this.sessionRepository.create({
        userId: payload.userId,
        userName: payload.userName,
        userRole: payload.userRole || null,
        device: payload.device || null,
        browser: payload.browser || null,
        location: payload.location || null,
        ipAddress: payload.ipAddress || null,
        trusted: payload.trusted || false,
        status: 'active',
        lastSeenAt: new Date(),
        expiresAt: payload.expiresAt || null,
      });
    } else {
      session.userName = payload.userName || session.userName;
      session.userRole = payload.userRole || session.userRole;
      session.device = payload.device || session.device;
      session.browser = payload.browser || session.browser;
      session.location = payload.location || session.location;
      session.ipAddress = payload.ipAddress || session.ipAddress;
      session.trusted = typeof payload.trusted === 'boolean' ? payload.trusted : session.trusted;
      session.status = 'active';
      session.lastSeenAt = new Date();
      session.expiresAt = payload.expiresAt || session.expiresAt;
    }

    const saved = await this.sessionRepository.save(session);
    await this.createAuditLog({
      actorId: payload.userId,
      actorName: payload.userName,
      actorRole: payload.userRole,
      action: 'session_heartbeat',
      resourceType: 'session',
      resourceId: saved.id,
      metadata: { trusted: saved.trusted },
    });

    return saved;
  }

  async revokeSession(sessionId: string, actorName: string) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) return null;

    session.status = 'revoked';
    session.lastSeenAt = new Date();
    const saved = await this.sessionRepository.save(session);

    await this.createAuditLog({
      actorId: null,
      actorName,
      actorRole: 'admin',
      action: 'session_revoked',
      resourceType: 'session',
      resourceId: sessionId,
      metadata: { userId: session.userId },
      severity: 'warn',
    });

    return saved;
  }

  async listPolicies() {
    await this.ensureDefaults();
    const policies = await this.policyRepository.find({ order: { key: 'ASC' } });
    return { data: policies, total: policies.length };
  }

  async updatePolicy(key: string, value: Record<string, any>, updatedBy: string) {
    let policy = await this.policyRepository.findOne({ where: { key } });

    if (!policy) {
      policy = this.policyRepository.create({
        key,
        label: key,
        value,
        description: null,
        updatedBy,
      });
    } else {
      policy.value = value;
      policy.updatedBy = updatedBy;
    }

    const saved = await this.policyRepository.save(policy);

    await this.createAuditLog({
      actorName: updatedBy,
      actorRole: 'admin',
      action: 'security_policy_updated',
      resourceType: 'security_policy',
      resourceId: saved.id,
      metadata: { key },
      severity: 'warn',
    });

    return saved;
  }

  async listMfaEnrollments(userId?: string) {
    await this.ensureDefaults();
    const where = userId ? { userId } : {};
    const data = await this.mfaRepository.find({ where, order: { updatedAt: 'DESC' } });
    return {
      data,
      total: data.length,
      verified: data.filter((item) => item.isVerified).length,
      trustedDevices: data.filter((item) => item.trustedDevice).length,
    };
  }

  async enrollMfa(payload: Partial<MfaEnrollment> & { userId: string; userName: string; deviceLabel: string }) {
    const record = this.mfaRepository.create({
      userId: payload.userId,
      userName: payload.userName,
      method: payload.method || 'app',
      deviceLabel: payload.deviceLabel,
      trustedDevice: payload.trustedDevice || false,
      isVerified: payload.isVerified || false,
      lastUsedAt: payload.lastUsedAt || null,
    });

    const saved = await this.mfaRepository.save(record);
    await this.createAuditLog({
      actorId: payload.userId,
      actorName: payload.userName,
      action: 'mfa_enrollment_created',
      actorRole: payload.method,
      resourceType: 'mfa_enrollment',
      resourceId: saved.id,
      metadata: { method: saved.method },
    });

    return saved;
  }

  async verifyMfa(enrollmentId: string, verified: boolean) {
    const record = await this.mfaRepository.findOne({ where: { id: enrollmentId } });
    if (!record) return null;
    record.isVerified = verified;
    record.lastUsedAt = new Date();
    const saved = await this.mfaRepository.save(record);

    await this.createAuditLog({
      actorId: record.userId,
      actorName: record.userName,
      action: verified ? 'mfa_verified' : 'mfa_verification_removed',
      resourceType: 'mfa_enrollment',
      resourceId: saved.id,
      severity: verified ? 'info' : 'warn',
    });

    return saved;
  }

  async listWorkflows(status?: string) {
    await this.ensureDefaults();
    const qb = this.workflowRepository.createQueryBuilder('workflow').leftJoinAndSelect('workflow.steps', 'step').orderBy('workflow.updatedAt', 'DESC').addOrderBy('step.stepOrder', 'ASC');
    if (status) qb.andWhere('workflow.status = :status', { status });

    const data = await qb.getMany();
    const summary = {
      pending: data.filter((item) => item.status === 'pending').length,
      in_review: data.filter((item) => item.status === 'in_review').length,
      approved: data.filter((item) => item.status === 'approved').length,
      rejected: data.filter((item) => item.status === 'rejected').length,
      completed: data.filter((item) => item.status === 'completed').length,
      total: data.length,
    };

    return { data, summary };
  }

  async createWorkflow(payload: {
    title: string;
    type: string;
    requester?: string;
    owner?: string;
    priority?: 'low' | 'medium' | 'high';
    steps: string[];
    initialStatus?: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  }) {
    const process = this.workflowRepository.create({
      title: payload.title,
      type: payload.type,
      requester: payload.requester || null,
      owner: payload.owner || null,
      priority: payload.priority || 'medium',
      status: payload.initialStatus || 'pending',
      currentStep: 0,
      payload: {},
    });

    const savedProcess = await this.workflowRepository.save(process);

    const steps = payload.steps.map((stepName, index) =>
      this.stepRepository.create({
        processId: savedProcess.id,
        stepOrder: index,
        stepName,
        status: index === 0 ? 'active' : 'pending',
      })
    );

    await this.stepRepository.save(steps);

    await this.createAuditLog({
      actorName: payload.requester || 'system',
      action: 'workflow_created',
      resourceType: 'workflow_process',
      resourceId: savedProcess.id,
      metadata: { title: payload.title, steps: payload.steps.length },
    });

    return this.workflowRepository.findOne({ where: { id: savedProcess.id }, relations: ['steps'] });
  }

  async advanceWorkflow(processId: string, payload: { actor?: string; notes?: string; targetStatus?: string }) {
    const process = await this.workflowRepository.findOne({ where: { id: processId }, relations: ['steps'] });
    if (!process) return null;

    const orderedSteps = [...process.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const current = orderedSteps.find((step) => step.status === 'active') || null;

    if (current) {
      current.status = 'done';
      current.actor = payload.actor || null;
      current.notes = payload.notes || null;
      current.actedAt = new Date();
      await this.stepRepository.save(current);

      const next = orderedSteps.find((step) => step.stepOrder === current.stepOrder + 1);
      if (next) {
        next.status = 'active';
        await this.stepRepository.save(next);
        process.currentStep = next.stepOrder;
        process.status = payload.targetStatus === 'rejected' ? 'rejected' : 'in_review';
      } else {
        process.status = payload.targetStatus === 'rejected' ? 'rejected' : 'completed';
      }
    } else if (payload.targetStatus === 'approved') {
      process.status = 'approved';
    } else if (payload.targetStatus === 'completed') {
      process.status = 'completed';
     }

     const saved = await this.workflowRepository.save(process);

    await this.createAuditLog({
      actorName: payload.actor || 'system',
      action: 'workflow_advanced',
      resourceType: 'workflow_process',
      resourceId: processId,
      metadata: { status: saved.status, step: saved.currentStep },
      severity: saved.status === 'rejected' ? 'warn' : 'info',
    });

    return this.workflowRepository.findOne({ where: { id: processId }, relations: ['steps'] });
  }

  async getOverview() {
    await this.ensureDefaults();

    const [audit, sessions, workflows, policies, mfa] = await Promise.all([
      this.listAuditLogs({ limit: 40 }),
      this.listSessions({ status: 'active' }),
      this.listWorkflows(),
      this.listPolicies(),
      this.listMfaEnrollments(),
    ]);

    const today = new Date().toDateString();
    const todayLogs = audit.data.filter((item) => new Date(item.createdAt).toDateString() === today);

    const auditSummary = {
      totalToday: todayLogs.length,
      logins: todayLogs.filter((item) => item.action.includes('login') || item.action.includes('session')).length,
      edits: todayLogs.filter((item) => item.action.includes('updated') || item.action.includes('advanced')).length,
      exports: todayLogs.filter((item) => item.action.includes('export')).length,
      latest: audit.data.slice(0, 10),
    };

    return {
      audit: auditSummary,
      sessions: {
        active: sessions.active,
        total: sessions.total,
        latest: sessions.data.slice(0, 10),
      },
      security: {
        policies: policies.data,
        mfa: {
          total: mfa.total,
          verified: mfa.verified,
          trustedDevices: mfa.trustedDevices,
          latest: mfa.data.slice(0, 10),
        },
      },
      workflows: {
        summary: workflows.summary,
        latest: workflows.data.slice(0, 10),
      },
    };
  }
}
