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

    const settled = await service.registerPayment(
      {
        invoiceId: invoice.id,
        amount: 125000,
        method: 'bank_transfer',
        reference: 'TRX-8877',
        paidAt: '2026-08-11',
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
    expect(ledgerRepo.save).toHaveBeenCalledTimes(2);
  });
});
