import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { RunBillingDto } from './dto/run-billing.dto';
import { AuditLog } from '../enterprise/entities/audit-log.entity';
import { BuildingOrganization } from './entities/organization.entity';
import { BuildingPortfolio } from './entities/portfolio.entity';
import { BuildingSite } from './entities/site.entity';
import { BuildingBuilding } from './entities/building.entity';
import { BuildingFloor } from './entities/floor.entity';
import { BuildingUnit } from './entities/unit.entity';
import { BuildingPerson } from './entities/person.entity';
import { BuildingRoleAssignment } from './entities/role-assignment.entity';
import { BuildingAsset } from './entities/asset.entity';
import { BuildingWorkOrder } from './entities/work-order.entity';
import { BuildingContract } from './entities/contract.entity';
import { BuildingCharge } from './entities/charge.entity';
import { BuildingInvoice } from './entities/invoice.entity';
import { BuildingPayment } from './entities/payment.entity';
import { BuildingReceipt } from './entities/receipt.entity';
import { BuildingLedgerEntry } from './entities/ledger-entry.entity';

type Building360Scope = {
  role?: string | null;
  userId?: string | null;
  userName?: string | null;
  tenantId: string;
  schoolId?: string | null;
};

@Injectable()
export class Building360Service {
  constructor(
    @InjectRepository(BuildingOrganization)
    private readonly organizationRepository: Repository<BuildingOrganization>,
    @InjectRepository(BuildingPortfolio)
    private readonly portfolioRepository: Repository<BuildingPortfolio>,
    @InjectRepository(BuildingSite)
    private readonly siteRepository: Repository<BuildingSite>,
    @InjectRepository(BuildingBuilding)
    private readonly buildingRepository: Repository<BuildingBuilding>,
    @InjectRepository(BuildingFloor)
    private readonly floorRepository: Repository<BuildingFloor>,
    @InjectRepository(BuildingUnit)
    private readonly unitRepository: Repository<BuildingUnit>,
    @InjectRepository(BuildingPerson)
    private readonly personRepository: Repository<BuildingPerson>,
    @InjectRepository(BuildingRoleAssignment)
    private readonly roleAssignmentRepository: Repository<BuildingRoleAssignment>,
    @InjectRepository(BuildingAsset)
    private readonly assetRepository: Repository<BuildingAsset>,
    @InjectRepository(BuildingWorkOrder)
    private readonly workOrderRepository: Repository<BuildingWorkOrder>,
    @InjectRepository(BuildingContract)
    private readonly contractRepository: Repository<BuildingContract>,
    @InjectRepository(BuildingCharge)
    private readonly chargeRepository: Repository<BuildingCharge>,
    @InjectRepository(BuildingInvoice)
    private readonly invoiceRepository: Repository<BuildingInvoice>,
    @InjectRepository(BuildingPayment)
    private readonly paymentRepository: Repository<BuildingPayment>,
    @InjectRepository(BuildingReceipt)
    private readonly receiptRepository: Repository<BuildingReceipt>,
    @InjectRepository(BuildingLedgerEntry)
    private readonly ledgerRepository: Repository<BuildingLedgerEntry>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  private isGlobalRole(role?: string | null): boolean {
    return role === 'super_admin' || role === 'platform_admin';
  }

  private resolveScope(input: Partial<Building360Scope> = {}, payloadTenantId?: string): Building360Scope {
    const tenantFromScope = String(input.tenantId || input.schoolId || '').trim();
    const tenantFromPayload = String(payloadTenantId || '').trim();

    if (this.isGlobalRole(input.role || null)) {
      if (!tenantFromPayload) {
        throw new BadRequestException('tenantId is required for global roles.');
      }
      return {
        role: input.role || null,
        userId: input.userId || null,
        userName: input.userName || null,
        tenantId: tenantFromPayload,
        schoolId: input.schoolId || null,
      };
    }

    if (!tenantFromScope) {
      throw new ForbiddenException('Tenant scope is required.');
    }

    if (tenantFromPayload && tenantFromPayload !== tenantFromScope) {
      throw new ForbiddenException('Cannot override tenant scope for this role.');
    }

    return {
      role: input.role || null,
      userId: input.userId || null,
      userName: input.userName || null,
      tenantId: tenantFromScope,
      schoolId: input.schoolId || null,
    };
  }

  private async registerAudit(
    action: string,
    resourceType: string,
    resourceId: string | null,
    scopeInput: Partial<Building360Scope>,
    metadata: Record<string, any> = {},
  ) {
    const audit = this.auditRepository.create({
      action,
      resourceType,
      resourceId,
      actorId: scopeInput.userId || null,
      actorName: scopeInput.userName || null,
      actorRole: scopeInput.role || null,
      schoolId: scopeInput.schoolId || null,
      tenantId: scopeInput.tenantId || null,
      severity: 'info',
      metadata,
      ipAddress: null,
      userAgent: null,
    });

    await this.auditRepository.save(audit);
  }

  private normalizeToken(value: unknown): string {
    return String(value || '').trim().toLowerCase();
  }

  private parseCsvRows(csvText: string): Array<Record<string, string>> {
    const lines = String(csvText || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((item) => item.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((item) => item.trim());
      return headers.reduce((acc, header, index) => {
        acc[header] = values[index] || '';
        return acc;
      }, {} as Record<string, string>);
    });
  }

  private todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private buildDocumentNumber(prefix: 'INV' | 'REC'): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `${prefix}-${datePart}-${randPart}`;
  }

  async getOverview(scopeInput?: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput || {});
    const [sites, buildings, units, people, roleAssignments] = await Promise.all([
      this.siteRepository.count({ where: { tenantId: scope.tenantId, isActive: true } }),
      this.buildingRepository.count({ where: { tenantId: scope.tenantId, isActive: true } }),
      this.unitRepository.count({ where: { tenantId: scope.tenantId, isActive: true } }),
      this.personRepository.count({ where: { tenantId: scope.tenantId, isActive: true } }),
      this.roleAssignmentRepository.count({ where: { tenantId: scope.tenantId, isActive: true } }),
    ]);

    const [assets, workOrdersOpen, workOrdersDone, criticalAssets, warningAssets] = await Promise.all([
      this.assetRepository.count({ where: { tenantId: scope.tenantId, isActive: true } }),
      this.workOrderRepository.count({ where: { tenantId: scope.tenantId, isActive: true, status: 'open' } }),
      this.workOrderRepository.count({ where: { tenantId: scope.tenantId, isActive: true, status: 'done' } }),
      this.assetRepository.count({ where: { tenantId: scope.tenantId, isActive: true, criticality: 'critical' } }),
      this.assetRepository.count({ where: { tenantId: scope.tenantId, isActive: true, status: 'warning' } }),
    ]);

    return {
      tenantId: scope.tenantId,
      portfolio: {
        sites,
        buildings,
        units,
      },
      operations: {
        assets,
        workOrdersOpen,
        workOrdersDone,
      },
      maintenance: {
        criticalAssets,
        warningAssets,
      },
      people: {
        total: people,
        roleAssignments,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getSites(filters: { tenantId?: string; schoolId?: string; organizationId?: string; portfolioId?: string }) {
    const scope = this.resolveScope(filters, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    return this.siteRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getSitesScoped(
    scopeInput: Partial<Building360Scope>,
    filters: { tenantId?: string; schoolId?: string; organizationId?: string; portfolioId?: string } = {},
  ) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    return this.siteRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getBuildings(filters: { siteId?: string; tenantId?: string; schoolId?: string; organizationId?: string; portfolioId?: string }) {
    const scope = this.resolveScope(filters, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    return this.buildingRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getBuildingsScoped(
    scopeInput: Partial<Building360Scope>,
    filters: { siteId?: string; tenantId?: string; schoolId?: string; organizationId?: string; portfolioId?: string } = {},
  ) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.portfolioId) where.portfolioId = filters.portfolioId;
    return this.buildingRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getUnits(filters: { siteId?: string; buildingId?: string; type?: string; status?: string; tenantId?: string; schoolId?: string }) {
    const scope = this.resolveScope(filters, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.buildingId) where.buildingId = filters.buildingId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    return this.unitRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getUnitsScoped(
    scopeInput: Partial<Building360Scope>,
    filters: { siteId?: string; buildingId?: string; type?: string; status?: string; tenantId?: string; schoolId?: string } = {},
  ) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.buildingId) where.buildingId = filters.buildingId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    return this.unitRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getAssets(filters: { siteId?: string; buildingId?: string; status?: string; tenantId?: string; schoolId?: string }) {
    const scope = this.resolveScope(filters, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.buildingId) where.buildingId = filters.buildingId;
    if (filters.status) where.status = filters.status;
    return this.assetRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getAssetsScoped(
    scopeInput: Partial<Building360Scope>,
    filters: { siteId?: string; buildingId?: string; status?: string; tenantId?: string; schoolId?: string } = {},
  ) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.buildingId) where.buildingId = filters.buildingId;
    if (filters.status) where.status = filters.status;
    return this.assetRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getWorkOrders(filters: { status?: string; tenantId?: string; schoolId?: string }) {
    const scope = this.resolveScope(filters, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.status) where.status = filters.status;
    return this.workOrderRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getWorkOrdersScoped(
    scopeInput: Partial<Building360Scope>,
    filters: { status?: string; tenantId?: string; schoolId?: string } = {},
  ) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.status) where.status = filters.status;
    return this.workOrderRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async createWorkOrder(payload: CreateWorkOrderDto, scopeInput?: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput || {});
    const entity = this.workOrderRepository.create({
      tenantId: scope.tenantId,
      schoolId: scope.schoolId || null,
      assetId: payload.assetId || null,
      title: payload.title,
      requestedBy: payload.requestedBy || scope.userName || null,
      priority: payload.priority || 'medium',
      status: 'open',
      note: payload.note || null,
      assignedTo: null,
      closedAt: null,
      isActive: true,
    });
    const saved = await this.workOrderRepository.save(entity);
    await this.registerAudit('building360.work_order.requested', 'building_work_order', null, scope, payload as any);
    return saved;
  }

  async updateWorkOrder(id: string, payload: { status?: 'open' | 'in_progress' | 'done' | 'cancelled'; note?: string }, scopeInput?: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput || {});
    const entity = await this.workOrderRepository.findOne({ where: { id, tenantId: scope.tenantId, isActive: true } });
    if (!entity) throw new NotFoundException('Work order not found');
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.note !== undefined) entity.note = payload.note;
    entity.closedAt = entity.status === 'done' || entity.status === 'cancelled' ? new Date() : null;
    const saved = await this.workOrderRepository.save(entity);
    await this.registerAudit('building360.work_order.updated', 'building_work_order', id, scope, payload as any);
    return saved;
  }

  async runBilling(payload: RunBillingDto, scopeInput?: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput || {});
    const unitsInScope = await this.unitRepository.count({ where: { tenantId: scope.tenantId, isActive: true } });
    const simulatedInvoiceCount = payload.contractId ? 1 : Math.max(1, Math.floor(unitsInScope * 0.65));

    await this.registerAudit('building360.billing.run', 'building_billing', null, scope, {
      period: payload.period,
      dryRun: payload.dryRun,
      segment: payload.segment,
      contractId: payload.contractId,
      simulatedInvoiceCount,
    });

    return {
      tenantId: scope.tenantId,
      period: payload.period,
      dryRun: payload.dryRun !== false,
      segment: payload.segment || 'commercial',
      contractId: payload.contractId || null,
      invoicesGenerated: simulatedInvoiceCount,
      totalAmountMt: simulatedInvoiceCount * 565000,
      status: payload.dryRun === false ? 'executed' : 'simulated',
      generatedAt: new Date().toISOString(),
    };
  }

  async listContracts(scopeInput: Partial<Building360Scope>, filters: { tenantId?: string; status?: string } = {}) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.status) where.status = filters.status;
    return this.contractRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async createContract(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.contractRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      organizationId: payload?.organizationId || null,
      siteId: payload?.siteId || null,
      buildingId: payload?.buildingId || null,
      unitId: payload?.unitId || null,
      code: payload?.code || null,
      title: payload?.title,
      status: payload?.status || 'active',
      billingCycle: payload?.billingCycle || 'monthly',
      currency: payload?.currency || 'MZN',
      amount: Number(payload?.amount || 0),
      startsAt: payload?.startsAt,
      endsAt: payload?.endsAt || null,
      isActive: payload?.isActive !== false,
    });

    const saved = await this.contractRepository.save(entity);
    await this.registerAudit('building360.finance.contract.created', 'building_contract', saved.id, scope, {
      code: saved.code,
      amount: saved.amount,
      billingCycle: saved.billingCycle,
    });
    return saved;
  }

  async generateCharge(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const contract = await this.contractRepository.findOne({
      where: { id: payload?.contractId, tenantId: scope.tenantId, isActive: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const entity = this.chargeRepository.create({
      tenantId: scope.tenantId,
      schoolId: scope.schoolId || contract.schoolId || null,
      contractId: contract.id,
      unitId: contract.unitId,
      period: payload?.period,
      amount: Number(contract.amount || 0),
      dueDate: payload?.dueDate || null,
      status: 'pending',
      isActive: true,
    });

    const saved = await this.chargeRepository.save(entity);
    await this.registerAudit('building360.finance.charge.generated', 'building_charge', saved.id, scope, {
      contractId: contract.id,
      period: saved.period,
      amount: saved.amount,
    });
    return saved;
  }

  async issueInvoice(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const charge = await this.chargeRepository.findOne({
      where: { id: payload?.chargeId, tenantId: scope.tenantId, isActive: true },
    });
    if (!charge) throw new NotFoundException('Charge not found');

    const contract = await this.contractRepository.findOne({
      where: { id: charge.contractId, tenantId: scope.tenantId, isActive: true },
    });
    if (!contract) throw new NotFoundException('Contract not found for charge');

    const invoice = this.invoiceRepository.create({
      tenantId: scope.tenantId,
      schoolId: scope.schoolId || charge.schoolId || null,
      contractId: contract.id,
      chargeId: charge.id,
      invoiceNumber: this.buildDocumentNumber('INV'),
      amount: Number(charge.amount || 0),
      currency: contract.currency || 'MZN',
      issuedAt: payload?.issuedAt || this.todayIsoDate(),
      dueDate: payload?.dueDate || charge.dueDate || null,
      status: 'issued',
      isActive: true,
    });

    const saved = await this.invoiceRepository.save(invoice);
    charge.status = 'invoiced';
    await this.chargeRepository.save(charge);

    await this.ledgerRepository.save(
      this.ledgerRepository.create({
        tenantId: scope.tenantId,
        schoolId: scope.schoolId || null,
        direction: 'debit',
        entryType: 'invoice_issued',
        amount: Number(saved.amount || 0),
        currency: saved.currency || 'MZN',
        referenceType: 'invoice',
        referenceId: saved.id,
        note: `Invoice ${saved.invoiceNumber} issued`,
        occurredAt: saved.issuedAt,
      }),
    );

    await this.registerAudit('building360.finance.invoice.issued', 'building_invoice', saved.id, scope, {
      chargeId: charge.id,
      amount: saved.amount,
      invoiceNumber: saved.invoiceNumber,
    });
    return saved;
  }

  async registerPayment(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const invoice = await this.invoiceRepository.findOne({
      where: { id: payload?.invoiceId, tenantId: scope.tenantId, isActive: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const amount = Number(payload?.amount || 0);
    if (amount <= 0) throw new BadRequestException('Payment amount must be greater than zero');

    const payment = await this.paymentRepository.save(
      this.paymentRepository.create({
        tenantId: scope.tenantId,
        schoolId: scope.schoolId || invoice.schoolId || null,
        invoiceId: invoice.id,
        amount,
        currency: payload?.currency || invoice.currency || 'MZN',
        method: payload?.method || 'bank_transfer',
        reference: payload?.reference || null,
        paidAt: payload?.paidAt || this.todayIsoDate(),
        status: 'confirmed',
        isActive: true,
      }),
    );

    const receipt = await this.receiptRepository.save(
      this.receiptRepository.create({
        tenantId: scope.tenantId,
        schoolId: scope.schoolId || invoice.schoolId || null,
        invoiceId: invoice.id,
        paymentId: payment.id,
        receiptNumber: this.buildDocumentNumber('REC'),
        amount,
        currency: payment.currency,
        issuedAt: payment.paidAt,
        isActive: true,
      }),
    );

    invoice.status = amount >= Number(invoice.amount || 0) ? 'paid' : 'partially_paid';
    await this.invoiceRepository.save(invoice);

    await this.ledgerRepository.save(
      this.ledgerRepository.create({
        tenantId: scope.tenantId,
        schoolId: scope.schoolId || null,
        direction: 'credit',
        entryType: 'payment_confirmed',
        amount,
        currency: payment.currency,
        referenceType: 'payment',
        referenceId: payment.id,
        note: `Payment ${payment.id} confirmed`,
        occurredAt: payment.paidAt,
      }),
    );

    await this.registerAudit('building360.finance.payment.registered', 'building_payment', payment.id, scope, {
      invoiceId: invoice.id,
      amount,
      method: payment.method,
      receiptNumber: receipt.receiptNumber,
    });

    return {
      payment,
      receipt,
      invoiceStatus: invoice.status,
    };
  }

  async listInvoices(scopeInput: Partial<Building360Scope>, filters: { tenantId?: string; status?: string; period?: string } = {}) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters.status) where.status = filters.status;
    const invoices = await this.invoiceRepository.find({ where, order: { createdAt: 'DESC' } });
    if (!filters.period) return invoices;
    return invoices.filter((item) => String(item.issuedAt || '').startsWith(`${filters.period}-`) || String(item.invoiceNumber || '').includes(filters.period.replace('-', '')));
  }

  async listReceipts(scopeInput: Partial<Building360Scope>, filters: { tenantId?: string } = {}) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    return this.receiptRepository.find({ where: { tenantId: scope.tenantId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async listOrganizations(scopeInput: Partial<Building360Scope>, filters: { tenantId?: string } = {}) {
    const scope = this.resolveScope(scopeInput, filters.tenantId);
    return this.organizationRepository.find({ where: { tenantId: scope.tenantId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async createOrganization(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.organizationRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      name: payload?.name,
      code: payload?.code || null,
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.organizationRepository.save(entity);
    await this.registerAudit('building360.organization.created', 'building_organization', saved.id, scope, { name: saved.name });
    return saved;
  }

  async updateOrganization(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.organizationRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Organization not found');
    if (payload?.name !== undefined) entity.name = payload.name;
    if (payload?.code !== undefined) entity.code = payload.code;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.organizationRepository.save(entity);
    await this.registerAudit('building360.organization.updated', 'building_organization', id, scope, payload || {});
    return saved;
  }

  async deactivateOrganization(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updateOrganization(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async listPortfolios(scopeInput: Partial<Building360Scope>, filters: any = {}) {
    const scope = this.resolveScope(scopeInput, filters?.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    return this.portfolioRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async createPortfolio(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.portfolioRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      organizationId: payload?.organizationId,
      name: payload?.name,
      code: payload?.code || null,
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.portfolioRepository.save(entity);
    await this.registerAudit('building360.portfolio.created', 'building_portfolio', saved.id, scope, { name: saved.name });
    return saved;
  }

  async updatePortfolio(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.portfolioRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Portfolio not found');
    if (payload?.name !== undefined) entity.name = payload.name;
    if (payload?.code !== undefined) entity.code = payload.code;
    if (payload?.organizationId !== undefined) entity.organizationId = payload.organizationId;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.portfolioRepository.save(entity);
    await this.registerAudit('building360.portfolio.updated', 'building_portfolio', id, scope, payload || {});
    return saved;
  }

  async deactivatePortfolio(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updatePortfolio(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async createSite(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.siteRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      organizationId: payload?.organizationId,
      portfolioId: payload?.portfolioId || null,
      name: payload?.name,
      city: payload?.city || 'N/A',
      type: payload?.type || 'commercial',
      code: payload?.code || null,
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.siteRepository.save(entity);
    await this.registerAudit('building360.site.created', 'building_site', saved.id, scope, { name: saved.name });
    return saved;
  }

  async updateSite(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.siteRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Site not found');
    if (payload?.name !== undefined) entity.name = payload.name;
    if (payload?.city !== undefined) entity.city = payload.city;
    if (payload?.type !== undefined) entity.type = payload.type;
    if (payload?.code !== undefined) entity.code = payload.code;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.organizationId !== undefined) entity.organizationId = payload.organizationId;
    if (payload?.portfolioId !== undefined) entity.portfolioId = payload.portfolioId;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.siteRepository.save(entity);
    await this.registerAudit('building360.site.updated', 'building_site', id, scope, payload || {});
    return saved;
  }

  async deactivateSite(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updateSite(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async createBuilding(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.buildingRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      organizationId: payload?.organizationId,
      portfolioId: payload?.portfolioId || null,
      siteId: payload?.siteId,
      name: payload?.name,
      code: payload?.code || null,
      floors: Number(payload?.floors || 1),
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.buildingRepository.save(entity);
    await this.registerAudit('building360.building.created', 'building_building', saved.id, scope, { name: saved.name });
    return saved;
  }

  async updateBuilding(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.buildingRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Building not found');
    if (payload?.name !== undefined) entity.name = payload.name;
    if (payload?.code !== undefined) entity.code = payload.code;
    if (payload?.floors !== undefined) entity.floors = Number(payload.floors || 1);
    if (payload?.siteId !== undefined) entity.siteId = payload.siteId;
    if (payload?.organizationId !== undefined) entity.organizationId = payload.organizationId;
    if (payload?.portfolioId !== undefined) entity.portfolioId = payload.portfolioId;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.buildingRepository.save(entity);
    await this.registerAudit('building360.building.updated', 'building_building', id, scope, payload || {});
    return saved;
  }

  async deactivateBuilding(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updateBuilding(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async listFloors(scopeInput: Partial<Building360Scope>, filters: any = {}) {
    const scope = this.resolveScope(scopeInput, filters?.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters?.buildingId) where.buildingId = filters.buildingId;
    return this.floorRepository.find({ where, order: { level: 'ASC' } });
  }

  async createFloor(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.floorRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      buildingId: payload?.buildingId,
      label: payload?.label,
      level: Number(payload?.level || 0),
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.floorRepository.save(entity);
    await this.registerAudit('building360.floor.created', 'building_floor', saved.id, scope, { label: saved.label });
    return saved;
  }

  async updateFloor(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.floorRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Floor not found');
    if (payload?.label !== undefined) entity.label = payload.label;
    if (payload?.level !== undefined) entity.level = Number(payload.level || 0);
    if (payload?.buildingId !== undefined) entity.buildingId = payload.buildingId;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.floorRepository.save(entity);
    await this.registerAudit('building360.floor.updated', 'building_floor', id, scope, payload || {});
    return saved;
  }

  async deactivateFloor(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updateFloor(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async createUnit(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.unitRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      buildingId: payload?.buildingId,
      floorId: payload?.floorId || null,
      siteId: payload?.siteId || null,
      number: payload?.number,
      code: payload?.code || null,
      type: payload?.type || 'office',
      status: payload?.status || 'vacant',
      areaM2: Number(payload?.areaM2 || 0),
      isActive: payload?.isActive !== false,
    });
    const saved = await this.unitRepository.save(entity);
    await this.registerAudit('building360.unit.created', 'building_unit', saved.id, scope, { number: saved.number });
    return saved;
  }

  async updateUnit(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.unitRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Unit not found');
    if (payload?.number !== undefined) entity.number = payload.number;
    if (payload?.code !== undefined) entity.code = payload.code;
    if (payload?.buildingId !== undefined) entity.buildingId = payload.buildingId;
    if (payload?.floorId !== undefined) entity.floorId = payload.floorId;
    if (payload?.siteId !== undefined) entity.siteId = payload.siteId;
    if (payload?.type !== undefined) entity.type = payload.type;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.areaM2 !== undefined) entity.areaM2 = Number(payload.areaM2 || 0);
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.unitRepository.save(entity);
    await this.registerAudit('building360.unit.updated', 'building_unit', id, scope, payload || {});
    return saved;
  }

  async deactivateUnit(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updateUnit(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async listPeople(scopeInput: Partial<Building360Scope>, filters: any = {}) {
    const scope = this.resolveScope(scopeInput, filters?.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    if (filters?.unitId) where.unitId = filters.unitId;
    return this.personRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async createPerson(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.personRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      organizationId: payload?.organizationId || null,
      unitId: payload?.unitId || null,
      fullName: payload?.fullName,
      code: payload?.code || null,
      email: payload?.email || null,
      phone: payload?.phone || null,
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.personRepository.save(entity);
    await this.registerAudit('building360.person.created', 'building_person', saved.id, scope, { fullName: saved.fullName });
    return saved;
  }

  async updatePerson(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.personRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Person not found');
    if (payload?.fullName !== undefined) entity.fullName = payload.fullName;
    if (payload?.code !== undefined) entity.code = payload.code;
    if (payload?.email !== undefined) entity.email = payload.email;
    if (payload?.phone !== undefined) entity.phone = payload.phone;
    if (payload?.organizationId !== undefined) entity.organizationId = payload.organizationId;
    if (payload?.unitId !== undefined) entity.unitId = payload.unitId;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.personRepository.save(entity);
    await this.registerAudit('building360.person.updated', 'building_person', id, scope, payload || {});
    return saved;
  }

  async deactivatePerson(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updatePerson(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async listRoleAssignments(scopeInput: Partial<Building360Scope>, filters: any = {}) {
    const scope = this.resolveScope(scopeInput, filters?.tenantId);
    const where: any = { tenantId: scope.tenantId, isActive: true };
    if (filters?.personId) where.personId = filters.personId;
    if (filters?.role) where.role = filters.role;
    return this.roleAssignmentRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async createRoleAssignment(payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = this.roleAssignmentRepository.create({
      tenantId: scope.tenantId,
      schoolId: payload?.schoolId || scope.schoolId || null,
      personId: payload?.personId,
      organizationId: payload?.organizationId || null,
      siteId: payload?.siteId || null,
      buildingId: payload?.buildingId || null,
      unitId: payload?.unitId || null,
      role: payload?.role,
      status: payload?.status || 'active',
      isActive: payload?.isActive !== false,
    });
    const saved = await this.roleAssignmentRepository.save(entity);
    await this.registerAudit('building360.role_assignment.created', 'building_role_assignment', saved.id, scope, { role: saved.role });
    return saved;
  }

  async updateRoleAssignment(id: string, payload: any, scopeInput: Partial<Building360Scope>) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const entity = await this.roleAssignmentRepository.findOne({ where: { id, tenantId: scope.tenantId } });
    if (!entity) throw new NotFoundException('Role assignment not found');
    if (payload?.role !== undefined) entity.role = payload.role;
    if (payload?.personId !== undefined) entity.personId = payload.personId;
    if (payload?.organizationId !== undefined) entity.organizationId = payload.organizationId;
    if (payload?.siteId !== undefined) entity.siteId = payload.siteId;
    if (payload?.buildingId !== undefined) entity.buildingId = payload.buildingId;
    if (payload?.unitId !== undefined) entity.unitId = payload.unitId;
    if (payload?.status !== undefined) entity.status = payload.status;
    if (payload?.isActive !== undefined) entity.isActive = Boolean(payload.isActive);
    const saved = await this.roleAssignmentRepository.save(entity);
    await this.registerAudit('building360.role_assignment.updated', 'building_role_assignment', id, scope, payload || {});
    return saved;
  }

  async deactivateRoleAssignment(id: string, scopeInput: Partial<Building360Scope>, tenantId?: string) {
    return this.updateRoleAssignment(id, { tenantId, status: 'inactive', isActive: false }, scopeInput);
  }

  async importOnboardingCsv(
    payload: {
      tenantId?: string;
      target: 'organization' | 'site' | 'building' | 'unit' | 'person' | 'role_assignment';
      csvText: string;
    },
    scopeInput: Partial<Building360Scope>,
  ) {
    const scope = this.resolveScope(scopeInput, payload?.tenantId);
    const rows = this.parseCsvRows(payload.csvText);

    if (rows.length === 0) {
      throw new BadRequestException('CSV sem linhas validas. Forneca cabecalho e pelo menos uma linha.');
    }

    const created: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    const organizations = await this.organizationRepository.find({ where: { tenantId: scope.tenantId } });
    const sites = await this.siteRepository.find({ where: { tenantId: scope.tenantId } });
    const buildings = await this.buildingRepository.find({ where: { tenantId: scope.tenantId } });
    const units = await this.unitRepository.find({ where: { tenantId: scope.tenantId } });
    const people = await this.personRepository.find({ where: { tenantId: scope.tenantId } });

    const orgByCode = new Map(organizations.map((item) => [this.normalizeToken(item.code), item]));
    const siteByCode = new Map(sites.map((item) => [this.normalizeToken(item.code), item]));
    const buildingByCode = new Map(buildings.map((item) => [this.normalizeToken(item.code), item]));
    const unitByCodeOrNumber = new Map(
      units.flatMap((item) => [
        [this.normalizeToken(item.code), item] as [string, BuildingUnit],
        [this.normalizeToken(item.number), item] as [string, BuildingUnit],
      ]).filter(([key]) => key.length > 0),
    );
    const personByEmail = new Map(people.map((item) => [this.normalizeToken(item.email), item]));

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      try {
        if (payload.target === 'organization') {
          const saved = await this.createOrganization(
            {
              tenantId: scope.tenantId,
              schoolId: row.schoolId || scope.schoolId || null,
              name: row.name,
              code: row.code || null,
              status: row.status || 'active',
              isActive: row.isActive ? row.isActive !== 'false' : true,
            },
            scope,
          );
          created.push(saved);
          orgByCode.set(this.normalizeToken(saved.code), saved);
          continue;
        }

        if (payload.target === 'site') {
          const orgCode = this.normalizeToken(row.organizationCode);
          const org = orgByCode.get(orgCode);
          if (!org) throw new BadRequestException(`organizationCode nao encontrado: ${row.organizationCode}`);
          const saved = await this.createSite(
            {
              tenantId: scope.tenantId,
              schoolId: row.schoolId || scope.schoolId || null,
              organizationId: org.id,
              name: row.name,
              city: row.city,
              type: row.type || 'commercial',
              code: row.code || null,
              status: row.status || 'active',
              isActive: row.isActive ? row.isActive !== 'false' : true,
            },
            scope,
          );
          created.push(saved);
          siteByCode.set(this.normalizeToken(saved.code), saved);
          continue;
        }

        if (payload.target === 'building') {
          const siteCode = this.normalizeToken(row.siteCode);
          const site = siteByCode.get(siteCode);
          if (!site) throw new BadRequestException(`siteCode nao encontrado: ${row.siteCode}`);
          const saved = await this.createBuilding(
            {
              tenantId: scope.tenantId,
              schoolId: row.schoolId || scope.schoolId || null,
              organizationId: site.organizationId,
              portfolioId: site.portfolioId,
              siteId: site.id,
              name: row.name,
              code: row.code || null,
              floors: Number(row.floors || 1),
              status: row.status || 'active',
              isActive: row.isActive ? row.isActive !== 'false' : true,
            },
            scope,
          );
          created.push(saved);
          buildingByCode.set(this.normalizeToken(saved.code), saved);
          continue;
        }

        if (payload.target === 'unit') {
          const buildingCode = this.normalizeToken(row.buildingCode);
          const building = buildingByCode.get(buildingCode);
          if (!building) throw new BadRequestException(`buildingCode nao encontrado: ${row.buildingCode}`);
          const saved = await this.createUnit(
            {
              tenantId: scope.tenantId,
              schoolId: row.schoolId || scope.schoolId || null,
              buildingId: building.id,
              siteId: building.siteId,
              number: row.number,
              code: row.code || null,
              type: row.type || 'office',
              status: row.status || 'vacant',
              areaM2: Number(row.areaM2 || 0),
              isActive: row.isActive ? row.isActive !== 'false' : true,
            },
            scope,
          );
          created.push(saved);
          unitByCodeOrNumber.set(this.normalizeToken(saved.code), saved);
          unitByCodeOrNumber.set(this.normalizeToken(saved.number), saved);
          continue;
        }

        if (payload.target === 'person') {
          const orgCode = this.normalizeToken(row.organizationCode);
          const org = orgByCode.get(orgCode);
          const unitKey = this.normalizeToken(row.unitCode || row.unitNumber || row.unit);
          const unit = unitByCodeOrNumber.get(unitKey);
          const saved = await this.createPerson(
            {
              tenantId: scope.tenantId,
              schoolId: row.schoolId || scope.schoolId || null,
              organizationId: org?.id || null,
              unitId: unit?.id || null,
              fullName: row.fullName,
              email: row.email || null,
              phone: row.phone || null,
              code: row.code || null,
              status: row.status || 'active',
              isActive: row.isActive ? row.isActive !== 'false' : true,
            },
            scope,
          );
          created.push(saved);
          personByEmail.set(this.normalizeToken(saved.email), saved);
          continue;
        }

        if (payload.target === 'role_assignment') {
          const person = personByEmail.get(this.normalizeToken(row.email));
          if (!person) throw new BadRequestException(`Pessoa nao encontrada para email: ${row.email}`);
          const org = orgByCode.get(this.normalizeToken(row.organizationCode));
          const site = siteByCode.get(this.normalizeToken(row.siteCode));
          const building = buildingByCode.get(this.normalizeToken(row.buildingCode));
          const unit = unitByCodeOrNumber.get(this.normalizeToken(row.unitCode || row.unitNumber || row.unit));
          const saved = await this.createRoleAssignment(
            {
              tenantId: scope.tenantId,
              schoolId: row.schoolId || scope.schoolId || null,
              personId: person.id,
              organizationId: org?.id || null,
              siteId: site?.id || null,
              buildingId: building?.id || null,
              unitId: unit?.id || null,
              role: row.role,
              status: row.status || 'active',
              isActive: row.isActive ? row.isActive !== 'false' : true,
            },
            scope,
          );
          created.push(saved);
          continue;
        }
      } catch (error: any) {
        errors.push({
          row: index + 2,
          error: String(error?.message || error),
        });
      }
    }

    await this.registerAudit('building360.onboarding.csv_import', 'building_onboarding', null, scope, {
      target: payload.target,
      totalRows: rows.length,
      created: created.length,
      errors: errors.length,
    });

    return {
      target: payload.target,
      tenantId: scope.tenantId,
      totalRows: rows.length,
      created: created.length,
      errors,
      sample: created.slice(0, 10),
    };
  }
}
