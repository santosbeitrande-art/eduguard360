import { ForbiddenException } from '@nestjs/common';
import { EnterpriseRbacGuard } from './enterprise-rbac.guard';

const makeContext = (request: Record<string, any>) => ({
  switchToHttp: () => ({ getRequest: () => request }),
  getHandler: () => ({}),
  getClass: () => ({}),
});

describe('EnterpriseRbacGuard platform scope', () => {
  it('allows a verified platform administrator without a tenant claim', () => {
    const request = { user: { sub: 'platform-user', role: 'platform_admin' } };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new EnterpriseRbacGuard(reflector as any);

    expect(guard.canActivate(makeContext(request) as any)).toBe(true);
    expect(request).toHaveProperty('enterprisePrincipal.role', 'platform_admin');
  });

  it('still requires a tenant scope for building managers', () => {
    const request = { user: { sub: 'building-user', role: 'building_manager' } };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new EnterpriseRbacGuard(reflector as any);

    expect(() => guard.canActivate(makeContext(request) as any)).toThrow(ForbiddenException);
  });
});
