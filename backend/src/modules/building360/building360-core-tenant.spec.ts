import { Building360Service } from './building360.service';

const makeRepo = () => ({
  count: jest.fn().mockResolvedValue(0),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn((input: any) => input),
  save: jest.fn(async (input: any) => ({ id: input.id || 'id-1', ...input })),
});

describe('Building360 Core tenant isolation', () => {
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

  it('applies tenant filter when listing organizations', async () => {
    await service.listOrganizations({ role: 'director', tenantId: 'tenant-a' });
    expect(orgRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a' }) }));
  });

  it('applies tenant filter when listing portfolios', async () => {
    await service.listPortfolios({ role: 'director', tenantId: 'tenant-a' }, { organizationId: 'org-1' });
    expect(portfolioRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', organizationId: 'org-1' }) }));
  });

  it('applies tenant filter when listing sites', async () => {
    await service.getSites({ role: 'director', tenantId: 'tenant-a', organizationId: 'org-1' });
    expect(siteRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', organizationId: 'org-1' }) }));
  });

  it('applies tenant filter when listing buildings', async () => {
    await service.getBuildings({ role: 'director', tenantId: 'tenant-a', siteId: 'site-1' });
    expect(buildingRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', siteId: 'site-1' }) }));
  });

  it('applies tenant filter when listing units', async () => {
    await service.getUnits({ role: 'director', tenantId: 'tenant-a', buildingId: 'bld-1' });
    expect(unitRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', buildingId: 'bld-1' }) }));
  });

  it('applies tenant filter when listing floors', async () => {
    await service.listFloors({ role: 'director', tenantId: 'tenant-a' }, { buildingId: 'bld-1' });
    expect(floorRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', buildingId: 'bld-1' }) }));
  });

  it('applies tenant filter when listing people', async () => {
    await service.listPeople({ role: 'director', tenantId: 'tenant-a' }, { unitId: 'unit-1' });
    expect(personRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', unitId: 'unit-1' }) }));
  });

  it('applies tenant filter when listing role assignments', async () => {
    await service.listRoleAssignments({ role: 'director', tenantId: 'tenant-a' }, { personId: 'person-1' });
    expect(roleRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a', personId: 'person-1' }) }));
  });

  it('requires explicit tenantId for global roles', async () => {
    await expect(service.listOrganizations({ role: 'super_admin' as any }, {})).rejects.toThrow('tenantId is required for global roles');
  });
});
