import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard Supabase session fallback', () => {
  const originalEnvironment = {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const parentPrototype = Object.getPrototypeOf(JwtAuthGuard.prototype);

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnvironment.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalEnvironment.url;
    if (originalEnvironment.anonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalEnvironment.anonKey;
    if (originalEnvironment.serviceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnvironment.serviceRoleKey;
  });

  it('maps only server-managed app metadata from a verified Supabase session', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-test-key';
    jest.spyOn(parentPrototype, 'canActivate').mockRejectedValue(new UnauthorizedException());
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'auth-user-id',
      email: 'manager@example.co.mz',
      user_metadata: { full_name: 'Building Manager' },
      app_metadata: {
        building360_role: 'building_manager',
        building360_tenant_id: 'tenant-42',
        building360_site_id: 'site-7',
      },
    }), { status: 200 }));
    const request = { headers: { authorization: 'Bearer signed-supabase-token' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) };

    await expect(new JwtAuthGuard().canActivate(context as any)).resolves.toBe(true);

    expect(request).toHaveProperty('user.role', 'building_manager');
    expect(request).toHaveProperty('user.tenantId', 'tenant-42');
    expect(request).toHaveProperty('user.building360_site_id', 'site-7');
  });

  it('rejects sessions that Supabase does not validate', async () => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-test-key';
    jest.spyOn(parentPrototype, 'canActivate').mockRejectedValue(new UnauthorizedException());
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer invalid' } }) }) };

    await expect(new JwtAuthGuard().canActivate(context as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
