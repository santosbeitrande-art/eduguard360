import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ActiveSession } from './entities/active-session.entity';
import { SecurityPolicy } from './entities/security-policy.entity';
import { MfaEnrollment } from './entities/mfa-enrollment.entity';
import { WorkflowProcess } from './entities/workflow-process.entity';
import { WorkflowStep } from './entities/workflow-step.entity';
import {
  EnterpriseRole,
  getAccessMatrix,
  getRolePermissions,
  normalizeEnterpriseRole,
  resolvePortalByRole,
} from './rbac.matrix';

export type EnterpriseScope = {
  role: EnterpriseRole;
  userId: string | null;
  userName: string | null;
  schoolId: string | null;
  tenantId: string | null;
};

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

  private normalizeScope(input?: Partial<EnterpriseScope>): EnterpriseScope {
    return {
      role: normalizeEnterpriseRole(input?.role),
      userId: input?.userId || null,
      userName: input?.userName || null,
      schoolId: input?.schoolId || null,
      tenantId: input?.tenantId || input?.schoolId || null,
    };
  }

  private enforceTenantScope(scope: EnterpriseScope): void {
    if (scope.role === 'super_admin') return;
    if (scope.schoolId || scope.tenantId) return;
    throw new ForbiddenException('school_id or tenant_id is required for this role.');
  }

  private applyScopedQuery(qb: any, alias: string, scope: EnterpriseScope) {
    if (scope.role === 'super_admin') return;

    this.enforceTenantScope(scope);
    const scopeTenant = scope.tenantId || scope.schoolId;

    if (scopeTenant) {
      qb.andWhere(`(${alias}.tenantId = :tenantId OR ${alias}.schoolId = :schoolId)`, {
        tenantId: scopeTenant,
        schoolId: scope.schoolId || scopeTenant,
      });
      return;
    }

    qb.andWhere(`${alias}.schoolId = :schoolId`, {
      schoolId: scope.schoolId,
    });
  }

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
      }, { role: 'super_admin', userId: null, userName: 'system', schoolId: null, tenantId: null });

      await this.createWorkflow({
        title: 'Declaração escolar - emissão',
        type: 'declaracao',
        requester: 'Encarregado',
        owner: 'Direção',
        priority: 'medium',
        steps: ['Pedido', 'Secretaria', 'Direção', 'Concluído'],
      }, { role: 'super_admin', userId: null, userName: 'system', schoolId: null, tenantId: null });
    }
  }

  async listAuditLogs(
    query: { limit?: number; actorId?: string; action?: string },
    scopeInput?: Partial<EnterpriseScope>,
  ) {
    const scope = this.normalizeScope(scopeInput);
    await this.ensureDefaults();
    const qb = this.auditRepository.createQueryBuilder('audit').orderBy('audit.createdAt', 'DESC');
    this.applyScopedQuery(qb, 'audit', scope);

    if (query.actorId) qb.andWhere('audit.actorId = :actorId', { actorId: query.actorId });
    if (query.action) qb.andWhere('audit.action = :action', { action: query.action });
    qb.take(Math.min(query.limit || 50, 200));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createAuditLog(payload: Partial<AuditLog>, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const log = this.auditRepository.create({
      actorId: payload.actorId || null,
      actorName: payload.actorName || scope.userName || null,
      actorRole: payload.actorRole || scope.role,
      action: payload.action || 'unknown_action',
      resourceType: payload.resourceType || 'unknown_resource',
      resourceId: payload.resourceId || null,
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
      severity: payload.severity || 'info',
      metadata: payload.metadata || {},
      ipAddress: payload.ipAddress || null,
      userAgent: payload.userAgent || null,
    });
    return this.auditRepository.save(log);
  }

  async listSessions(query: { userId?: string; status?: string }, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    await this.ensureDefaults();
    const qb = this.sessionRepository.createQueryBuilder('session').orderBy('session.lastSeenAt', 'DESC');
    this.applyScopedQuery(qb, 'session', scope);
    if (query.userId) qb.andWhere('session.userId = :userId', { userId: query.userId });
    if (query.status) qb.andWhere('session.status = :status', { status: query.status });

    const sessions = await qb.getMany();
    return {
      data: sessions,
      total: sessions.length,
      active: sessions.filter((item: ActiveSession) => item.status === 'active').length,
    };
  }

  async upsertSession(
    payload: Partial<ActiveSession> & { userId: string; userName: string },
    scopeInput?: Partial<EnterpriseScope>,
  ) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const sessionId = payload.id || null;
    let session: ActiveSession | null = null;

    if (sessionId) {
      session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    }

    if (!session) {
      session = this.sessionRepository.create({
        userId: payload.userId,
        userName: payload.userName,
        userRole: payload.userRole || scope.role,
        schoolId: scope.schoolId,
        tenantId: scope.tenantId,
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
      session.userRole = payload.userRole || session.userRole || scope.role;
      session.schoolId = scope.schoolId || session.schoolId;
      session.tenantId = scope.tenantId || session.tenantId;
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
      actorRole: payload.userRole || scope.role,
      action: 'session_heartbeat',
      resourceType: 'session',
      resourceId: saved.id,
      metadata: { trusted: saved.trusted },
    }, scope);

    return saved;
  }

  async revokeSession(sessionId: string, actorName: string, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) return null;

    if (scope.role !== 'super_admin') {
      const targetScope = session.tenantId || session.schoolId;
      const viewerScope = scope.tenantId || scope.schoolId;
      if (targetScope && viewerScope && targetScope !== viewerScope) {
        throw new ForbiddenException('Cannot revoke session outside your tenant scope.');
      }
    }

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
    }, scope);

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

  async listMfaEnrollments(userId?: string, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    await this.ensureDefaults();
    const qb = this.mfaRepository.createQueryBuilder('mfa').orderBy('mfa.updatedAt', 'DESC');
    this.applyScopedQuery(qb, 'mfa', scope);
    if (userId) qb.andWhere('mfa.userId = :userId', { userId });
    const data = await qb.getMany();
    return {
      data,
      total: data.length,
      verified: data.filter((item: MfaEnrollment) => item.isVerified).length,
      trustedDevices: data.filter((item: MfaEnrollment) => item.trustedDevice).length,
    };
  }

  async enrollMfa(
    payload: Partial<MfaEnrollment> & { userId: string; userName: string; deviceLabel: string },
    scopeInput?: Partial<EnterpriseScope>,
  ) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const record = this.mfaRepository.create({
      userId: payload.userId,
      userName: payload.userName,
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
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
    }, scope);

    return saved;
  }

  async verifyMfa(enrollmentId: string, verified: boolean, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const record = await this.mfaRepository.findOne({ where: { id: enrollmentId } });
    if (!record) return null;

    if (scope.role !== 'super_admin') {
      const targetScope = record.tenantId || record.schoolId;
      const viewerScope = scope.tenantId || scope.schoolId;
      if (targetScope && viewerScope && targetScope !== viewerScope) {
        throw new ForbiddenException('Cannot verify MFA outside your tenant scope.');
      }
    }

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
    }, scope);

    return saved;
  }

  async listWorkflows(status?: string, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    await this.ensureDefaults();
    const qb = this.workflowRepository.createQueryBuilder('workflow').leftJoinAndSelect('workflow.steps', 'step').orderBy('workflow.updatedAt', 'DESC').addOrderBy('step.stepOrder', 'ASC');
    this.applyScopedQuery(qb, 'workflow', scope);
    if (status) qb.andWhere('workflow.status = :status', { status });

    const data = await qb.getMany();
    const summary = {
      pending: data.filter((item: WorkflowProcess) => item.status === 'pending').length,
      in_review: data.filter((item: WorkflowProcess) => item.status === 'in_review').length,
      approved: data.filter((item: WorkflowProcess) => item.status === 'approved').length,
      rejected: data.filter((item: WorkflowProcess) => item.status === 'rejected').length,
      completed: data.filter((item: WorkflowProcess) => item.status === 'completed').length,
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
  }, scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const process = this.workflowRepository.create({
      title: payload.title,
      type: payload.type,
      requester: payload.requester || null,
      owner: payload.owner || null,
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
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
    }, scope);

    return this.workflowRepository.findOne({ where: { id: savedProcess.id }, relations: ['steps'] });
  }

  async advanceWorkflow(
    processId: string,
    payload: { actor?: string; notes?: string; targetStatus?: string },
    scopeInput?: Partial<EnterpriseScope>,
  ) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const process = await this.workflowRepository.findOne({ where: { id: processId }, relations: ['steps'] });
    if (!process) return null;

    if (scope.role !== 'super_admin') {
      const targetScope = process.tenantId || process.schoolId;
      const viewerScope = scope.tenantId || scope.schoolId;
      if (targetScope && viewerScope && targetScope !== viewerScope) {
        throw new ForbiddenException('Cannot advance workflow outside your tenant scope.');
      }
    }

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
    }, scope);

    return this.workflowRepository.findOne({ where: { id: processId }, relations: ['steps'] });
  }

  async getOverview(scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    await this.ensureDefaults();

    const [audit, sessions, workflows, policies, mfa] = await Promise.all([
      this.listAuditLogs({ limit: 40 }, scope),
      this.listSessions({ status: 'active' }, scope),
      this.listWorkflows(undefined, scope),
      this.listPolicies(),
      this.listMfaEnrollments(undefined, scope),
    ]);

    const today = new Date().toDateString();
    const todayLogs = audit.data.filter((item: AuditLog) => new Date(item.createdAt).toDateString() === today);

    const auditSummary = {
      totalToday: todayLogs.length,
      logins: todayLogs.filter((item: AuditLog) => item.action.includes('login') || item.action.includes('session')).length,
      edits: todayLogs.filter((item: AuditLog) => item.action.includes('updated') || item.action.includes('advanced')).length,
      exports: todayLogs.filter((item: AuditLog) => item.action.includes('export')).length,
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
      scope: {
        role: scope.role,
        schoolId: scope.schoolId,
        tenantId: scope.tenantId,
      },
    };
  }

  getRbacMatrix() {
    return {
      generatedAt: new Date().toISOString(),
      ...getAccessMatrix(),
    };
  }

  resolveAccessProfile(payload: {
    role?: string;
    schoolId?: string | null;
    tenantId?: string | null;
    userId?: string | null;
  }) {
    const role = normalizeEnterpriseRole(payload.role);
    const portal = resolvePortalByRole(role);
    const permissions = getRolePermissions(role);
    const isGlobalRole = role === 'super_admin';

    const tenantScope = {
      mode: isGlobalRole ? 'global' : 'school',
      schoolId: payload.schoolId || null,
      tenantId: payload.tenantId || payload.schoolId || null,
    };

    const analyticsScope = isGlobalRole
      ? {
          level: 'global',
          canViewAllSchools: true,
          modules: ['schools', 'students', 'users', 'entries', 'courses', 'payments', 'analytics'],
        }
      : {
          level: 'school',
          canViewAllSchools: false,
          schoolId: payload.schoolId || null,
          modules: Object.entries(permissions)
            .filter(([, actions]) => Array.isArray(actions) && actions.includes('read'))
            .map(([domain]) => domain),
        };

    return {
      role,
      portal,
      permissions,
      tenantScope,
      analyticsScope,
      subject: {
        userId: payload.userId || null,
      },
    };
  }
}
