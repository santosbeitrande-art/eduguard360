import { ForbiddenException } from '@nestjs/common';
import { Building360DemoRequestService } from './building360-demo-request.service';
import { Building360DemoRequest } from './entities/demo-request.entity';
import { AuditLog } from '../enterprise/entities/audit-log.entity';
import { BuildingOrganization } from './entities/organization.entity';
import { BuildingSite } from './entities/site.entity';
import { BuildingBuilding } from './entities/building.entity';
import { BuildingPerson } from './entities/person.entity';
import { BuildingRoleAssignment } from './entities/role-assignment.entity';

const requestSeed = () => ({
  id: 'b8794e2b-7901-4ba8-b668-4c428b06b4d8',
  name: 'Maria Admin',
  organizationName: 'Condominio Central',
  email: 'maria@example.co.mz',
  phone: '+258841234567',
  city: 'Maputo',
  buildingName: 'Torre A',
  plan: 'essencial',
  message: null,
  status: 'pending',
  tenantId: null,
  organizationId: null,
  siteId: null,
  buildingId: null,
  invitedUserId: null,
  reviewedBy: null,
  reviewedAt: null,
  provisioningError: null,
});

const makeRepository = (nextId: string) => ({
  create: jest.fn((value: Record<string, unknown>) => ({ ...value })),
  save: jest.fn(async (value: Record<string, unknown>) => ({ id: nextId, ...value })),
  find: jest.fn(async () => []),
  findOne: jest.fn(async () => null),
  update: jest.fn(async () => ({ affected: 1 })),
});

describe('Building360 demo request provisioning', () => {
  const originalEnvironment = {
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    redirectUrl: process.env.BUILDING360_INVITE_REDIRECT_URL,
  };

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnvironment.supabaseUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalEnvironment.supabaseUrl;
    if (originalEnvironment.serviceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvironment.serviceRoleKey;
    if (originalEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment.nodeEnv;
    if (originalEnvironment.redirectUrl === undefined) delete process.env.BUILDING360_INVITE_REDIRECT_URL;
    else process.env.BUILDING360_INVITE_REDIRECT_URL = originalEnvironment.redirectUrl;
  });

  it('creates a pending request and normalizes its email', async () => {
    const requestRepository = makeRepository('request-1');
    const auditRepository = makeRepository('audit-1');
    const repositories = new Map([
      [Building360DemoRequest, requestRepository],
      [AuditLog, auditRepository],
    ]);
    const dataSource = {
      transaction: jest.fn(async (callback: (manager: any) => Promise<unknown>) => callback({
        getRepository: (entity: unknown) => repositories.get(entity) || makeRepository('created'),
      })),
    };
    const service = new Building360DemoRequestService(
      requestRepository as any,
      auditRepository as any,
      makeRepository('organization') as any,
      makeRepository('site') as any,
      makeRepository('building') as any,
      makeRepository('person') as any,
      makeRepository('assignment') as any,
      dataSource as any,
    );

    await expect(service.submit({
      name: 'Maria Admin',
      organizationName: 'Condominio Central',
      email: ' MARIA@EXAMPLE.CO.MZ ',
      city: 'Maputo',
      buildingName: 'Torre A',
      plan: 'essencial',
      privacyConsent: true,
    })).resolves.toEqual({ requestId: 'request-1', status: 'pending' });

    expect(requestRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'maria@example.co.mz',
      status: 'pending',
    }));
    expect(auditRepository.save).toHaveBeenCalled();
  });

  it('rejects request review by a tenant administrator', async () => {
    const service = new Building360DemoRequestService(
      makeRepository('request') as any,
      makeRepository('audit') as any,
      makeRepository('organization') as any,
      makeRepository('site') as any,
      makeRepository('building') as any,
      makeRepository('person') as any,
      makeRepository('assignment') as any,
      { transaction: jest.fn() } as any,
    );

    await expect(service.list(undefined, { role: 'building_manager' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('provisions an isolated tenant and sets trusted Supabase app metadata after manual approval', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    process.env.NODE_ENV = 'test';

    let request = requestSeed();
    const requestRepository = {
      findOne: jest.fn(async () => request),
      save: jest.fn(async (value: typeof request) => {
        request = { ...request, ...value };
        return request;
      }),
      update: jest.fn(async (_where: unknown, values: Partial<typeof request>) => {
        request = { ...request, ...values };
        return { affected: 1 };
      }),
    };
    let idCounter = 0;
    const repositoryFor = () => ({
      create: jest.fn((value: Record<string, unknown>) => ({ ...value })),
      save: jest.fn(async (value: Record<string, unknown>) => ({ id: `row-${++idCounter}`, ...value })),
      findOne: jest.fn(async () => request),
    });
    const auditRepository = repositoryFor();
    const organizationRepository = repositoryFor();
    const siteRepository = repositoryFor();
    const buildingRepository = repositoryFor();
    const personRepository = repositoryFor();
    const assignmentRepository = repositoryFor();
    const repositoryMap = new Map([
      [Building360DemoRequest, requestRepository],
      [AuditLog, auditRepository],
      [BuildingOrganization, organizationRepository],
      [BuildingSite, siteRepository],
      [BuildingBuilding, buildingRepository],
      [BuildingPerson, personRepository],
      [BuildingRoleAssignment, assignmentRepository],
    ]);
    const dataSource = {
      transaction: jest.fn(async (callback: (manager: any) => Promise<unknown>) => callback({
        getRepository: (entity: unknown) => repositoryMap.get(entity),
      })),
    };
    const service = new Building360DemoRequestService(
      requestRepository as any,
      auditRepository as any,
      organizationRepository as any,
      siteRepository as any,
      buildingRepository as any,
      personRepository as any,
      assignmentRepository as any,
      dataSource as any,
    );
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'supabase-user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    const result = await service.approve(request.id, { role: 'platform_admin', userId: 'platform-user' });

    expect(result).toMatchObject({
      status: 'approved',
      tenantId: expect.any(String),
      invitedUserId: 'supabase-user-1',
    });
    expect(request.status).toBe('approved');
    expect(organizationRepository.save).toHaveBeenCalledWith(expect.objectContaining({ tenantId: request.tenantId }));
    expect(assignmentRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: request.tenantId,
      role: 'building_manager',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      app_metadata: {
        building360_role: 'building_manager',
        building360_tenant_id: request.tenantId,
      },
    });
  });
});
