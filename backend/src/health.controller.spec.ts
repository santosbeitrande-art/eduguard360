import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const requiredVariables = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'BUILDING360_INVITE_REDIRECT_URL',
  ];
  const originalEnvironment = new Map<string, string | undefined>();
  const dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
  let controller: HealthController;

  beforeAll(() => {
    for (const name of requiredVariables) originalEnvironment.set(name, process.env[name]);
  });

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://database.example/building360';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.BUILDING360_INVITE_REDIRECT_URL = 'https://eduguard360.co.mz/auth/recovery';
    dataSource.query.mockClear().mockResolvedValue([{ '?column?': 1 }]);
    controller = new HealthController(dataSource as any);
  });

  afterAll(() => {
    for (const [name, value] of originalEnvironment) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('reports readiness only after configuration and database connectivity are verified', async () => {
    await expect(controller.getReadiness()).resolves.toMatchObject({
      ok: true,
      service: 'eduguard360-business-api',
      ready: true,
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('lists missing server configuration without exposing secret values', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(controller.getReadiness()).rejects.toMatchObject({
      response: {
        status: 'not_ready',
        missingConfiguration: expect.arrayContaining(['SUPABASE_SERVICE_ROLE_KEY']),
      },
      status: 503,
    });
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS Supabase and invitation redirect URLs', async () => {
    process.env.SUPABASE_URL = 'http://project.supabase.co';
    process.env.BUILDING360_INVITE_REDIRECT_URL = 'http://eduguard360.co.mz/auth/recovery';

    await expect(controller.getReadiness()).rejects.toMatchObject({
      response: {
        status: 'not_ready',
        missingConfiguration: expect.arrayContaining([
          'SUPABASE_URL (HTTPS required)',
          'BUILDING360_INVITE_REDIRECT_URL (HTTPS required)',
        ]),
      },
      status: 503,
    });
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('reports database failures as not ready', async () => {
    dataSource.query.mockRejectedValueOnce(new Error('database connection refused'));

    await expect(controller.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
