import { Building360Service } from './building360.service';

const makeRepo = () => {
  const store = new Map<string, any>();
  let seq = 1;

  return {
    count: jest.fn().mockImplementation(async ({ where }: any = {}) => {
      const rows = Array.from(store.values());
      if (!where) return rows.length;
      return rows.filter((row) => Object.entries(where).every(([k, v]) => row[k] === v)).length;
    }),
    find: jest.fn().mockImplementation(async ({ where }: any = {}) => {
      const rows = Array.from(store.values());
      if (!where) return rows;
      return rows.filter((row) => Object.entries(where).every(([k, v]) => row[k] === v));
    }),
    findOne: jest.fn().mockImplementation(async ({ where }: any = {}) => {
      const rows = Array.from(store.values());
      return rows.find((row) => Object.entries(where || {}).every(([k, v]) => row[k] === v)) || null;
    }),
    create: jest.fn((input: any) => ({ ...input })),
    save: jest.fn(async (input: any) => {
      const id = input.id || `id-${seq++}`;
      const saved = {
        ...input,
        id,
        createdAt: input.createdAt || new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      store.set(id, saved);
      return saved;
    }),
  };
};

describe('Building360 Finance flow', () => {
  const orgRepo = makeRepo();
  const portfolioRepo = makeRepo();
  const siteRepo = makeRepo();
  const buildingRepo = makeRepo();
  const floorRepo = makeRepo();
  const unitRepo = makeRepo();
  const personRepo = makeRepo();
  const roleRepo = makeRepo();
  const assetRepo = makeRepo();
  const workOrderRepo = makeRepo();
  const contractRepo = makeRepo();
  const chargeRepo = makeRepo();
  const invoiceRepo = makeRepo();
  const paymentRepo = makeRepo();
  const receiptRepo = makeRepo();
  const ledgerRepo = makeRepo();
  const auditRepo = makeRepo();

  const service = new Building360Service(
    orgRepo as any,
    portfolioRepo as any,
    siteRepo as any,
    buildingRepo as any,
    floorRepo as any,
    unitRepo as any,
    personRepo as any,
    roleRepo as any,
    assetRepo as any,
    workOrderRepo as any,
    contractRepo as any,
    chargeRepo as any,
    invoiceRepo as any,
    paymentRepo as any,
    receiptRepo as any,
    ledgerRepo as any,
    auditRepo as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs contract -> charge -> invoice -> payment -> receipt with tenant isolation', async () => {
    const scope = { role: 'finance_manager', tenantId: 'tenant-fin-1', schoolId: 'school-fin-1', userId: 'u-fin-1' } as any;

    const contract = await service.createContract(
      {
        title: 'Contrato Torre A - Unidade 402',
        code: 'CTR-402',
        amount: 125000,
        billingCycle: 'monthly',
        currency: 'MZN',
        startsAt: '2026-01-01',
      },
      scope,
    );

    const charge = await service.generateCharge(
      {
        contractId: contract.id,
        period: '2026-08',
        dueDate: '2026-08-20',
      },
      scope,
    );

    const invoice = await service.issueInvoice(
      {
        chargeId: charge.id,
        issuedAt: '2026-08-10',
        dueDate: '2026-08-20',
      },
      scope,
    );

    const partial = await service.registerPayment(
      {
        invoiceId: invoice.id,
        amount: 50000,
        method: 'bank_transfer',
        reference: 'TRX-8877',
        paidAt: '2026-08-11',
      },
      scope,
    );
    expect(partial.invoiceStatus).toBe('partially_paid');

    await expect(service.registerPayment(
      { invoiceId: invoice.id, amount: 80000, method: 'bank_transfer' },
      scope,
    )).rejects.toThrow('Payment exceeds invoice balance');

    const settled = await service.registerPayment(
      {
        invoiceId: invoice.id,
        amount: 75000,
        method: 'bank_transfer',
        reference: 'TRX-8878',
        paidAt: '2026-08-12',
      },
      scope,
    );

    expect(contract.tenantId).toBe('tenant-fin-1');
    expect(charge.tenantId).toBe('tenant-fin-1');
    expect(invoice.tenantId).toBe('tenant-fin-1');
    expect(settled.payment.tenantId).toBe('tenant-fin-1');
    expect(settled.receipt.tenantId).toBe('tenant-fin-1');
    expect(settled.invoiceStatus).toBe('paid');

    expect(auditRepo.save).toHaveBeenCalled();
    expect(ledgerRepo.save).toHaveBeenCalledTimes(3);
  });

  it('does not attach a contract to a unit from another tenant', async () => {
    unitRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.createContract(
      {
        title: 'Contrato fora do tenant',
        amount: 1000,
        startsAt: '2026-01-01',
        unitId: 'unit-from-other-tenant',
      },
      { role: 'finance_manager', tenantId: 'tenant-fin-2' } as any,
    )).rejects.toThrow('Unit not found in this tenant');
    expect(contractRepo.save).not.toHaveBeenCalled();
  });

  it('records expenses and opening cash within the authenticated tenant', async () => {
    const scope = { role: 'finance_manager', tenantId: 'tenant-ledger-a', userId: 'finance-a' } as any;
    const expense = await service.createExpense({
      description: 'Reparação da bomba',
      supplier: 'Fornecedor local',
      amount: 1200,
      occurredAt: '2026-09-15',
      reference: 'REC-EXP-10',
    }, scope);
    const opening = await service.createOpeningBalance({
      kind: 'system_cash',
      amount: 8000,
      asOfDate: '2026-09-01',
    }, scope);

    expect(expense).toMatchObject({
      tenantId: 'tenant-ledger-a',
      entryType: 'expense',
      direction: 'debit',
      amount: 1200,
      referenceId: 'REC-EXP-10',
    });
    expect(opening.bankBalanceConfirmed).toBe(false);
    expect(opening.entry).toMatchObject({
      tenantId: 'tenant-ledger-a',
      entryType: 'system_opening_balance',
      direction: 'credit',
      amount: 8000,
    });
    await service.listLedgerEntries({ role: 'finance_manager', tenantId: 'tenant-ledger-b' } as any);
    expect(ledgerRepo.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-ledger-b' },
    }));
  });

  it('creates historical debt as a dated invoice associated to a unit and contract', async () => {
    const scope = { role: 'finance_manager', tenantId: 'tenant-history-a', userId: 'finance-a' } as any;
    const unit = await unitRepo.save({
      tenantId: scope.tenantId,
      number: 'A-12',
      isActive: true,
    });
    const contract = await service.createContract({
      title: 'Quota mensal A-12',
      amount: 3000,
      startsAt: '2025-01-01',
      unitId: unit.id,
    }, scope);

    const invoice = await service.createOpeningBalance({
      kind: 'historical_debt',
      amount: 6000,
      asOfDate: '2025-12-01',
      unitId: unit.id,
      note: 'Dívida anterior à adesão',
    }, scope);

    expect(invoice).toMatchObject({
      tenantId: scope.tenantId,
      contractId: contract.id,
      issuedAt: '2025-12-01',
      amount: 6000,
      status: 'issued',
    });
    expect((await service.listInvoices(scope)).some((item) => item.id === invoice.id)).toBe(true);
  });

  it('reconciles an exact tenant payment once and rejects amount mismatches', async () => {
    const scope = { role: 'finance_manager', tenantId: 'tenant-bank-a', userId: 'finance-a' } as any;
    const payment = await paymentRepo.save({
      tenantId: scope.tenantId,
      invoiceId: 'invoice-bank-a',
      amount: 2500,
      currency: 'MZN',
      status: 'confirmed',
      isActive: true,
    });

    await expect(service.reconcilePayment({
      paymentId: payment.id,
      statementDate: '2026-09-20',
      statementReference: 'BANK-REF-55',
      amount: 2499,
    }, scope)).rejects.toThrow('Statement amount must match');

    const reconciled = await service.reconcilePayment({
      paymentId: payment.id,
      statementDate: '2026-09-20',
      statementReference: 'BANK-REF-55',
      amount: 2500,
    }, scope);
    expect(reconciled).toMatchObject({ reconciled: true });
    expect(reconciled.entry).toMatchObject({
      tenantId: scope.tenantId,
      entryType: 'bank_reconciled',
      referenceId: payment.id,
    });
    await expect(service.reconcilePayment({
      paymentId: payment.id,
      statementDate: '2026-09-20',
      statementReference: 'BANK-REF-55',
      amount: 2500,
    }, scope)).rejects.toThrow('already been reconciled');
  });
});
