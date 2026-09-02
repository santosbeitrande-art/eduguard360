import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';
import { Building360Service } from '../building360/building360.service';
import { ReservationsService } from '../reservations/reservations.service';

describe('Tenant/School Isolation E2E Guards', () => {
  const makeContext = (request: any) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => (() => undefined),
      getClass: () => class TestClass {},
    }) as any;

  it('rejects non-super-admin requests without tenant/school scope', () => {
    const guard = new EnterpriseRbacGuard(new Reflector());
    const request = {
      headers: {
        'x-enterprise-role': 'director',
      },
      user: { sub: 'user-1' },
      body: {},
      query: {},
    };

    expect(() => guard.canActivate(makeContext(request))).toThrow(ForbiddenException);
  });

  it('accepts scoped request and attaches enterprise principal', () => {
    const guard = new EnterpriseRbacGuard(new Reflector());
    const request = {
      headers: {},
      user: {
        sub: 'user-1',
        role: 'director',
        schoolId: 'school-1',
      },
      body: {},
      query: {},
    };

    const allowed = guard.canActivate(makeContext(request));

    expect(allowed).toBe(true);
    expect(request.enterprisePrincipal).toMatchObject({
      role: 'director',
      schoolId: 'school-1',
      tenantId: 'school-1',
      userId: 'user-1',
    });
  });

  it('accepts super_admin without explicit scope', () => {
    const guard = new EnterpriseRbacGuard(new Reflector());
    const request = {
      headers: {},
      user: {
        sub: 'root',
        role: 'super_admin',
      },
      body: {},
      query: {},
    };

    expect(guard.canActivate(makeContext(request))).toBe(true);
  });
});

describe('Tenant/School Isolation E2E Services', () => {
  const makeRepo = () => ({
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((input: any) => input),
    save: jest.fn(async (input: any) => ({ id: input.id || 'id-1', ...input })),
  });

  it('isolates Building360 work orders by tenant', () => {
    const service = new Building360Service(
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
    );

    const created = service.createWorkOrder(
      {
        assetId: 'GEN-001',
        title: 'Tenant 002 maintenance',
        priority: 'medium',
      },
      { tenantId: 'tenant-002' },
    );

    return created.then((item) => {
      expect(item.tenantId).toBe('tenant-002');
    });
  });

  it('rejects tenant override attempt for non-global Building360 roles', async () => {
    const service = new Building360Service(
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
      makeRepo() as any,
    );

    await expect(
      service.listContracts(
        {
          role: 'director',
          tenantId: 'tenant-1',
          schoolId: 'school-1',
        },
        {
          tenantId: 'tenant-2',
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('keeps scope filter when querying reservations for a role', async () => {
    const qb: any = {
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn(() => {
        throw new Error('where() should not be used after scope filter');
      }),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const reservationsRepository: any = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const listingsRepository: any = {};

    const service = new ReservationsService(reservationsRepository, listingsRepository);

    await service.getReservations('user-1', 'buyer', 1, 10, {
      role: 'director',
      schoolId: 'school-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      '(reservation.tenantId = :tenantId OR reservation.schoolId = :schoolId)',
      { tenantId: 'tenant-1', schoolId: 'school-1' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('reservation.buyerId = :userId', { userId: 'user-1' });
    expect(qb.where).not.toHaveBeenCalled();
  });
});
