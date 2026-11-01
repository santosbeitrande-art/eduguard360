import { JwtStrategy } from './jwt.strategy';

describe('JWT strategy trusted Supabase app metadata', () => {
  it('uses server-managed Building360 role and tenant claims when Supabase root role is authenticated', () => {
    const strategy = new JwtStrategy();

    expect(strategy.validate({
      sub: 'supabase-user-id',
      role: 'authenticated',
      app_metadata: {
        building360_role: 'building_manager',
        building360_tenant_id: 'tenant-42',
        building360_site_id: 'site-7',
      },
      user_metadata: { full_name: 'Building Admin' },
    })).toMatchObject({
      sub: 'supabase-user-id',
      role: 'building_manager',
      perfil: 'building_manager',
      tenantId: 'tenant-42',
      schoolId: null,
      building360_site_id: 'site-7',
      name: 'Building Admin',
    });
  });
});
