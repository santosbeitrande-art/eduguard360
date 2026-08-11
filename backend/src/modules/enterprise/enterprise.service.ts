import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ActiveSession } from './entities/active-session.entity';
import { SecurityPolicy } from './entities/security-policy.entity';
import { MfaEnrollment } from './entities/mfa-enrollment.entity';
import { WorkflowProcess } from './entities/workflow-process.entity';
import { WorkflowStep } from './entities/workflow-step.entity';
import { User } from '../users/entities/user.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
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

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await this.userRepository.query(
      `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
      `,
      [tableName],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  private async tableColumns(tableName: string): Promise<Set<string>> {
    const rows = await this.userRepository.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      `,
      [tableName],
    );
    return new Set((rows || []).map((item: any) => String(item?.column_name || '').trim()).filter(Boolean));
  }

  private async countOptionalEducationTable(
    tableName: string,
    scope: EnterpriseScope,
    schoolColumnCandidates: string[],
    tenantColumnCandidates: string[],
  ): Promise<number | null> {
    try {
      const exists = await this.tableExists(tableName);
      if (!exists) return null;

      const columns = await this.tableColumns(tableName);
      const schoolColumn = schoolColumnCandidates.find((name) => columns.has(name)) || null;
      const tenantColumn = tenantColumnCandidates.find((name) => columns.has(name)) || null;

      let sql = `SELECT COUNT(*)::int AS total FROM public."${tableName}"`;
      const params: Array<string> = [];

      if (scope.role !== 'super_admin') {
        this.enforceTenantScope(scope);
        const scopeTenant = String(scope.tenantId || scope.schoolId || '').trim();
        const scopeSchool = String(scope.schoolId || scope.tenantId || '').trim();

        if (tenantColumn && schoolColumn) {
          sql += ` WHERE ("${tenantColumn}" = $1 OR "${schoolColumn}" = $2)`;
          params.push(scopeTenant, scopeSchool);
        } else if (tenantColumn) {
          sql += ` WHERE "${tenantColumn}" = $1`;
          params.push(scopeTenant);
        } else if (schoolColumn) {
          sql += ` WHERE "${schoolColumn}" = $1`;
          params.push(scopeSchool);
        }
      }

      const rows = await this.userRepository.query(sql, params);
      return Number(rows?.[0]?.total || 0);
    } catch {
      return null;
    }
  }

  private inferOwnerRoleFromStepName(stepName: string): EnterpriseRole | null {
    const normalized = String(stepName || '').trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('secretaria') || normalized.includes('matr')) return 'secretaria';
    if (normalized.includes('coordena') || normalized.includes('pedag')) return 'coordenador';
    if (normalized.includes('dire') || normalized.includes('institucional')) return 'director';
    if (normalized.includes('finan') || normalized.includes('pag')) return 'financeiro';
    if (normalized.includes('rh') || normalized.includes('funcion')) return 'rh';
    if (normalized.includes('seguran') || normalized.includes('portaria') || normalized.includes('qr')) return 'seguranca';
    if (normalized.includes('professor') || normalized.includes('docente')) return 'professor';
    if (normalized.includes('admin') || normalized.includes('conclu')) return 'administrator';
    return null;
  }

  private normalizeWorkflowSteps(
    steps: Array<string | { stepName?: string; ownerRole?: string }>,
  ): Array<{ stepName: string; ownerRole: EnterpriseRole | null }> {
    return steps
      .map((entry) => {
        if (typeof entry === 'string') {
          const ownerRole = this.inferOwnerRoleFromStepName(entry);
          return {
            stepName: entry,
            ownerRole,
          };
        }

        const stepName = String(entry?.stepName || '').trim();
        if (!stepName) return null;

        const normalizedOwner = entry?.ownerRole
          ? normalizeEnterpriseRole(entry.ownerRole)
          : this.inferOwnerRoleFromStepName(stepName);

        return {
          stepName,
          ownerRole: normalizedOwner === 'unknown' ? null : normalizedOwner,
        };
      })
      .filter((item): item is { stepName: string; ownerRole: EnterpriseRole | null } => Boolean(item));
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
        steps: [
          { stepName: 'Submissão', ownerRole: 'secretaria' },
          { stepName: 'Validação Pedagógica', ownerRole: 'coordenador' },
          { stepName: 'Aprovação Institucional', ownerRole: 'director' },
          { stepName: 'Confirmação Financeira', ownerRole: 'financeiro' },
          { stepName: 'Concluído', ownerRole: 'administrator' },
        ],
      }, { role: 'super_admin', userId: null, userName: 'system', schoolId: null, tenantId: null });

      await this.createWorkflow({
        title: 'Declaração escolar - emissão',
        type: 'declaracao',
        requester: 'Encarregado',
        owner: 'Direção',
        priority: 'medium',
        steps: [
          { stepName: 'Submissão', ownerRole: 'secretaria' },
          { stepName: 'Aprovação Institucional', ownerRole: 'director' },
          { stepName: 'Concluído', ownerRole: 'administrator' },
        ],
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
    steps: Array<string | { stepName?: string; ownerRole?: string }>;
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

    const normalizedSteps = this.normalizeWorkflowSteps(payload.steps);
    if (normalizedSteps.length === 0) {
      throw new BadRequestException('Workflow must include at least one valid step.');
    }

    const steps = normalizedSteps.map((step, index) =>
      this.stepRepository.create({
        processId: savedProcess.id,
        stepOrder: index,
        stepName: step.stepName,
        ownerRole: step.ownerRole,
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
      const currentOwner = current.ownerRole
        ? normalizeEnterpriseRole(current.ownerRole)
        : this.inferOwnerRoleFromStepName(current.stepName);

      if (currentOwner && currentOwner !== 'unknown' && scope.role !== 'super_admin' && scope.role !== currentOwner) {
        throw new ForbiddenException(`Only role ${currentOwner} can execute the active workflow step.`);
      }

      if (!current.ownerRole && currentOwner && currentOwner !== 'unknown') {
        current.ownerRole = currentOwner;
      }

      current.status = 'done';
      current.actor = payload.actor || null;
      current.notes = payload.notes || null;
      current.actedAt = new Date();
      await this.stepRepository.save(current);

      const next = orderedSteps.find((step) => step.stepOrder === current.stepOrder + 1);
      if (next) {
        if (!next.ownerRole) {
          const nextOwner = this.inferOwnerRoleFromStepName(next.stepName);
          next.ownerRole = nextOwner;
        }
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

  async getAnalyticsOverview(scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const accessProfile = this.resolveAccessProfile({
      role: scope.role,
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
      userId: scope.userId,
    });

    const canRead = (domain: keyof typeof accessProfile.permissions) => {
      const actions = accessProfile.permissions[domain] || [];
      return Array.isArray(actions) && actions.includes('read');
    };

    let usersTotal = 0;
    let usersActive = 0;
    let schoolsTotal = 0;
    let studentsTotal = 0;
    let listingsTotal = 0;
    let listingsAvailable = 0;
    let reservationsTotal = 0;
    let reservationsActive = 0;
    let reservationsCompleted = 0;
    let reservationPending = 0;
    let reservationCancelled = 0;

    if (canRead('users')) {
      const usersQb = this.userRepository.createQueryBuilder('user').andWhere('user.deletedAt IS NULL');
      this.applyScopedQuery(usersQb, 'user', scope);
      usersTotal = await usersQb.getCount();

      const usersActiveQb = this.userRepository
        .createQueryBuilder('user')
        .andWhere('user.deletedAt IS NULL')
        .andWhere('user.isActive = :isActive', { isActive: true });
      this.applyScopedQuery(usersActiveQb, 'user', scope);
      usersActive = await usersActiveQb.getCount();
    }

    if (canRead('schools')) {
      const tableCount = await this.countOptionalEducationTable(
        'escolas',
        scope,
        ['id'],
        ['tenant_id', 'tenantId'],
      );

      if (typeof tableCount === 'number') {
        schoolsTotal = tableCount;
      } else {
        const schoolsQb = this.userRepository
          .createQueryBuilder('user')
          .select('COUNT(DISTINCT COALESCE(user.tenantId, user.schoolId))', 'total')
          .andWhere('user.deletedAt IS NULL');
        this.applyScopedQuery(schoolsQb, 'user', scope);
        const schoolRaw = await schoolsQb.getRawOne<{ total?: string }>();
        schoolsTotal = Number(schoolRaw?.total || 0);
      }
    }

    if (canRead('students')) {
      const tableCount = await this.countOptionalEducationTable(
        'alunos',
        scope,
        ['escola_id', 'school_id'],
        ['tenant_id', 'tenantId'],
      );

      if (typeof tableCount === 'number') {
        studentsTotal = tableCount;
      } else {
        const studentsQb = this.userRepository
          .createQueryBuilder('user')
          .andWhere('user.deletedAt IS NULL')
          .andWhere('(LOWER(user.role) = :studentRole OR LOWER(user.role) = :alunoRole)', {
            studentRole: 'student',
            alunoRole: 'aluno',
          });
        this.applyScopedQuery(studentsQb, 'user', scope);
        studentsTotal = await studentsQb.getCount();
      }
    }

    if (canRead('courses')) {
      const listingsQb = this.listingRepository.createQueryBuilder('listing').andWhere('listing.deletedAt IS NULL');
      this.applyScopedQuery(listingsQb, 'listing', scope);
      listingsTotal = await listingsQb.getCount();

      const listingsAvailableQb = this.listingRepository
        .createQueryBuilder('listing')
        .andWhere('listing.deletedAt IS NULL')
        .andWhere('listing.status = :status', { status: 'available' });
      this.applyScopedQuery(listingsAvailableQb, 'listing', scope);
      listingsAvailable = await listingsAvailableQb.getCount();
    }

    if (canRead('enrollments')) {
      const reservationsQb = this.reservationRepository.createQueryBuilder('reservation');
      this.applyScopedQuery(reservationsQb, 'reservation', scope);
      reservationsTotal = await reservationsQb.getCount();

      const activeQb = this.reservationRepository
        .createQueryBuilder('reservation')
        .andWhere('reservation.status = :status', { status: 'active' });
      this.applyScopedQuery(activeQb, 'reservation', scope);
      reservationsActive = await activeQb.getCount();

      const completedQb = this.reservationRepository
        .createQueryBuilder('reservation')
        .andWhere('reservation.status = :status', { status: 'completed' });
      this.applyScopedQuery(completedQb, 'reservation', scope);
      reservationsCompleted = await completedQb.getCount();

      const pendingQb = this.reservationRepository
        .createQueryBuilder('reservation')
        .andWhere('reservation.status = :status', { status: 'pending' });
      this.applyScopedQuery(pendingQb, 'reservation', scope);
      reservationPending = await pendingQb.getCount();

      const cancelledQb = this.reservationRepository
        .createQueryBuilder('reservation')
        .andWhere('reservation.status = :status', { status: 'cancelled' });
      this.applyScopedQuery(cancelledQb, 'reservation', scope);
      reservationCancelled = await cancelledQb.getCount();
    }

    let paymentsEstimatedMt = 0;
    if (canRead('payments')) {
      const sumQb = this.reservationRepository
        .createQueryBuilder('reservation')
        .leftJoin('reservation.listing', 'listing')
        .select('COALESCE(SUM(listing.price), 0)', 'total')
        .andWhere('reservation.status = :status', { status: 'completed' });
      this.applyScopedQuery(sumQb, 'reservation', scope);
      const raw = await sumQb.getRawOne<{ total?: string }>();
      paymentsEstimatedMt = Number(raw?.total || 0);
    }

    const roleLens: Record<string, any> = {
      director: {
        pendingApprovals: reservationsActive,
        operationalCoverage: usersTotal > 0 ? Math.round((usersActive / usersTotal) * 100) : 0,
      },
      professor: {
        activeClassesApprox: listingsAvailable,
        engagementApprox: reservationsTotal,
      },
      financeiro: {
        paymentsEstimatedMt,
        completedTransactions: reservationsCompleted,
      },
      secretaria: {
        activeEnrollments: reservationsActive,
        totalEnrollments: reservationsTotal,
      },
    };

    let roleDistribution: Array<{ role: string; total: number }> = [];
    if (canRead('users')) {
      const roleQb = this.userRepository
        .createQueryBuilder('user')
        .select(`COALESCE(NULLIF(LOWER(user.role), ''), 'unknown')`, 'role')
        .addSelect('COUNT(*)', 'total')
        .andWhere('user.deletedAt IS NULL')
        .groupBy(`COALESCE(NULLIF(LOWER(user.role), ''), 'unknown')`)
        .orderBy('total', 'DESC');
      this.applyScopedQuery(roleQb, 'user', scope);
      const rawRoles = await roleQb.getRawMany<Array<{ role?: string; total?: string }>>();
      roleDistribution = (rawRoles || []).map((item: any) => ({
        role: String(item?.role || 'unknown'),
        total: Number(item?.total || 0),
      }));
    }

    const schoolUserQb = this.userRepository
      .createQueryBuilder('user')
      .select(`COALESCE(NULLIF(user.schoolId, ''), NULLIF(user.tenantId, ''), 'Sem escopo')`, 'scopeId')
      .addSelect('COUNT(*)', 'users')
      .addSelect(`SUM(CASE WHEN user.isActive = true THEN 1 ELSE 0 END)`, 'activeUsers')
      .andWhere('user.deletedAt IS NULL')
      .groupBy(`COALESCE(NULLIF(user.schoolId, ''), NULLIF(user.tenantId, ''), 'Sem escopo')`)
      .orderBy('users', 'DESC');
    this.applyScopedQuery(schoolUserQb, 'user', scope);
    const rawSchoolUsers = (await schoolUserQb.getRawMany()) as Array<{ scopeId?: string; users?: string; activeUsers?: string }>;

    const reservationSchoolQb = this.reservationRepository
      .createQueryBuilder('reservation')
      .select(`COALESCE(NULLIF(reservation.schoolId, ''), NULLIF(reservation.tenantId, ''), 'Sem escopo')`, 'scopeId')
      .addSelect('COUNT(*)', 'movements')
      .groupBy(`COALESCE(NULLIF(reservation.schoolId, ''), NULLIF(reservation.tenantId, ''), 'Sem escopo')`);
    this.applyScopedQuery(reservationSchoolQb, 'reservation', scope);
    const rawReservationByScope = (await reservationSchoolQb.getRawMany()) as Array<{ scopeId?: string; movements?: string }>;

    const movementByScope = new Map<string, number>();
    for (const item of rawReservationByScope || []) {
      movementByScope.set(String(item?.scopeId || 'Sem escopo'), Number(item?.movements || 0));
    }

    const schoolDistribution = (rawSchoolUsers || []).map((item: any) => {
      const scopeId = String(item?.scopeId || 'Sem escopo');
      const users = Number(item?.users || 0);
      const activeUsers = Number(item?.activeUsers || 0);
      const movements = movementByScope.get(scopeId) || 0;
      return {
        id: scopeId,
        name: scopeId,
        users,
        activeUsers,
        movements,
      };
    });

    const totalUsersForDistribution = schoolDistribution.reduce((sum, row) => sum + row.users, 0);
    let allocatedStudents = 0;
    const schoolDistributionWithStudents = schoolDistribution.map((row, index) => {
      let students = 0;
      if (studentsTotal > 0 && totalUsersForDistribution > 0) {
        students = Math.round((row.users / totalUsersForDistribution) * studentsTotal);
      }
      if (index === schoolDistribution.length - 1) {
        students = Math.max(0, studentsTotal - allocatedStudents);
      }
      allocatedStudents += students;
      const frequency = students > 0
        ? Math.max(0, Math.min(100, Math.round((Math.min(movementsByScopeValue(row.id, movementByScope), students) / students) * 100)))
        : 0;
      return {
        ...row,
        students,
        frequency,
      };
    });

    const reservationStatusDistribution = [
      { status: 'active', total: reservationsActive },
      { status: 'pending', total: reservationPending },
      { status: 'completed', total: reservationsCompleted },
      { status: 'cancelled', total: reservationCancelled },
    ].filter((item) => item.total > 0);

    const trendQb = this.reservationRepository
      .createQueryBuilder('reservation')
      .select(`DATE_TRUNC('day', reservation.createdAt)`, 'day')
      .addSelect('COUNT(*)', 'total')
      .andWhere(`reservation.createdAt >= NOW() - INTERVAL '180 days'`)
      .groupBy(`DATE_TRUNC('day', reservation.createdAt)`)
      .orderBy(`DATE_TRUNC('day', reservation.createdAt)`, 'ASC');
    this.applyScopedQuery(trendQb, 'reservation', scope);
    const rawTrend = await trendQb.getRawMany<Array<{ day?: Date | string; total?: string }>>();
    const trendByDay = (rawTrend || []).map((item: any) => ({
      day: new Date(item?.day || new Date()).toISOString(),
      total: Number(item?.total || 0),
    }));

    return {
      accessProfile,
      scope: {
        role: scope.role,
        schoolId: scope.schoolId,
        tenantId: scope.tenantId,
      },
      metrics: {
        schoolsTotal,
        studentsTotal,
        usersTotal,
        usersActive,
        listingsTotal,
        listingsAvailable,
        reservationsTotal,
        reservationsActive,
        reservationsCompleted,
        reservationsPending: reservationPending,
        reservationsCancelled: reservationCancelled,
        paymentsEstimatedMt,
      },
      breakdowns: {
        schoolDistribution: schoolDistributionWithStudents,
        userRoleDistribution: roleDistribution,
        reservationStatusDistribution,
        trendByDay,
      },
      roleLens: roleLens[scope.role] || {
        operationalItems: reservationsTotal,
        trackedUsers: usersTotal,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getAnalyticsRankings(scopeInput?: Partial<EnterpriseScope>) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const accessProfile = this.resolveAccessProfile({
      role: scope.role,
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
      userId: scope.userId,
    });

    const canRead = (domain: keyof typeof accessProfile.permissions) => {
      const actions = accessProfile.permissions[domain] || [];
      return Array.isArray(actions) && actions.includes('read');
    };

    let courses: Array<{ id: string; label: string; score: number; subtitle: string }> = [];
    if (canRead('courses')) {
      const coursesQb = this.listingRepository
        .createQueryBuilder('listing')
        .leftJoin('listing.reservations', 'reservation')
        .select('listing.id', 'id')
        .addSelect('listing.title', 'title')
        .addSelect('listing.status', 'status')
        .addSelect('COUNT(reservation.id)', 'enrollments')
        .andWhere('listing.deletedAt IS NULL')
        .groupBy('listing.id')
        .addGroupBy('listing.title')
        .addGroupBy('listing.status')
        .orderBy('COUNT(reservation.id)', 'DESC')
        .addOrderBy('listing.createdAt', 'DESC')
        .limit(10);
      this.applyScopedQuery(coursesQb, 'listing', scope);

      const rawCourses = (await coursesQb.getRawMany()) as Array<{
        id?: string;
        title?: string;
        status?: string;
        enrollments?: string;
      }>;

      courses = (rawCourses || []).map((item) => ({
        id: String(item?.id || ''),
        label: String(item?.title || 'Curso sem título'),
        score: Number(item?.enrollments || 0),
        subtitle: `Status: ${String(item?.status || 'desconhecido')}`,
      }));
    }

    let professors: Array<{ id: string; label: string; score: number; subtitle: string }> = [];
    if (canRead('teachers') || canRead('users')) {
      const professorQb = this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.listings', 'listing')
        .leftJoin('listing.reservations', 'reservation', 'reservation.status = :completedStatus', { completedStatus: 'completed' })
        .select('user.id', 'id')
        .addSelect('user.name', 'name')
        .addSelect('COUNT(DISTINCT listing.id)', 'courses')
        .addSelect('COUNT(reservation.id)', 'completedTransactions')
        .andWhere('user.deletedAt IS NULL')
        .andWhere('(LOWER(user.role) = :roleTeacher OR LOWER(user.role) = :roleProfessor OR LOWER(user.role) = :roleDocente)', {
          roleTeacher: 'teacher',
          roleProfessor: 'professor',
          roleDocente: 'docente',
        })
        .groupBy('user.id')
        .addGroupBy('user.name')
        .orderBy('COUNT(reservation.id)', 'DESC')
        .addOrderBy('COUNT(DISTINCT listing.id)', 'DESC')
        .limit(10);
      this.applyScopedQuery(professorQb, 'user', scope);

      const rawProfessors = (await professorQb.getRawMany()) as Array<{
        id?: string;
        name?: string;
        courses?: string;
        completedTransactions?: string;
      }>;

      professors = (rawProfessors || []).map((item) => {
        const coursesTotal = Number(item?.courses || 0);
        const completedTotal = Number(item?.completedTransactions || 0);
        return {
          id: String(item?.id || ''),
          label: String(item?.name || 'Professor sem nome'),
          score: completedTotal,
          subtitle: `${coursesTotal} cursos · ${completedTotal} conclusões`,
        };
      });
    }

    return {
      scope: {
        role: scope.role,
        schoolId: scope.schoolId,
        tenantId: scope.tenantId,
      },
      courses,
      professors,
      generatedAt: new Date().toISOString(),
    };
  }
}

function movementsByScopeValue(scopeId: string, movementByScope: Map<string, number>): number {
  return movementByScope.get(scopeId) || 0;
}
