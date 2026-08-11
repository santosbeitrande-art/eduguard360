import { Building360Service } from './building360.service';

const makeRepo = () => ({
  count: jest.fn().mockResolvedValue(0),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn((input: any) => ({ ...input })),
  save: jest.fn(async (input: any) => ({
    id: input.id || `${input.name || input.number || input.fullName || input.role || 'item'}-${Math.random().toString(16).slice(2, 8)}`,
    ...input,
  })),
});

describe('Building360 onboarding CSV flow', () => {
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
    orgRepo.find.mockResolvedValue([]);
    siteRepo.find.mockResolvedValue([]);
    buildingRepo.find.mockResolvedValue([]);
    unitRepo.find.mockResolvedValue([]);
    personRepo.find.mockResolvedValue([]);
  });

  it('imports organization, site, building, unit, person and role assignment with tenant scope', async () => {
    const scope = { role: 'director', tenantId: 'tenant-core-1', schoolId: 'school-core-1', userId: 'u-1', userName: 'Operator' } as any;

    const org = await service.importOnboardingCsv(
      {
        target: 'organization',
        tenantId: 'tenant-core-1',
        csvText: 'name,code\nOrg Demo,ORG-DEMO',
      },
      scope,
    );

    expect(org.created).toBe(1);

    orgRepo.find.mockResolvedValue([{ id: 'org-1', tenantId: 'tenant-core-1', code: 'ORG-DEMO' }]);
    const site = await service.importOnboardingCsv(
      {
        target: 'site',
        tenantId: 'tenant-core-1',
        csvText: 'name,city,type,organizationCode,code\nSite A,Maputo,commercial,ORG-DEMO,SITE-A',
      },
      scope,
    );

    expect(site.created).toBe(1);

    siteRepo.find.mockResolvedValue([{ id: 'site-1', tenantId: 'tenant-core-1', organizationId: 'org-1', portfolioId: null, code: 'SITE-A' }]);
    const building = await service.importOnboardingCsv(
      {
        target: 'building',
        tenantId: 'tenant-core-1',
        csvText: 'name,floors,siteCode,code\nEdificio A,12,SITE-A,BLD-A',
      },
      scope,
    );

    expect(building.created).toBe(1);

    buildingRepo.find.mockResolvedValue([{ id: 'bld-1', tenantId: 'tenant-core-1', siteId: 'site-1', code: 'BLD-A' }]);
    const unit = await service.importOnboardingCsv(
      {
        target: 'unit',
        tenantId: 'tenant-core-1',
        csvText: 'number,type,status,areaM2,buildingCode,code\n402,office,occupied,126,BLD-A,UNIT-402',
      },
      scope,
    );

    expect(unit.created).toBe(1);

    unitRepo.find.mockResolvedValue([{ id: 'unit-1', tenantId: 'tenant-core-1', number: '402', code: 'UNIT-402' }]);
    orgRepo.find.mockResolvedValue([{ id: 'org-1', tenantId: 'tenant-core-1', code: 'ORG-DEMO' }]);
    const person = await service.importOnboardingCsv(
      {
        target: 'person',
        tenantId: 'tenant-core-1',
        csvText: 'fullName,email,organizationCode,unitNumber\nJoao Silva,joao@demo.co.mz,ORG-DEMO,402',
      },
      scope,
    );

    expect(person.created).toBe(1);

    personRepo.find.mockResolvedValue([{ id: 'person-1', tenantId: 'tenant-core-1', email: 'joao@demo.co.mz' }]);
    const role = await service.importOnboardingCsv(
      {
        target: 'role_assignment',
        tenantId: 'tenant-core-1',
        csvText: 'email,role,organizationCode,siteCode,buildingCode,unitNumber\njoao@demo.co.mz,resident,ORG-DEMO,SITE-A,BLD-A,402',
      },
      scope,
    );

    expect(role.created).toBe(1);
    expect(roleRepo.save).toHaveBeenCalled();
    expect(auditRepo.save).toHaveBeenCalled();
  });
});
