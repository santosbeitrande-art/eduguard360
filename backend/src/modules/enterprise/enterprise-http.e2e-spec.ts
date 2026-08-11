import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { RequireEnterprisePermission } from './decorators/enterprise-permission.decorator';
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';

@Controller('enterprise-test')
@UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
class EnterpriseTestController {
  @Get('probe')
  @RequireEnterprisePermission('analytics', 'read')
  probe() {
    return { ok: true };
  }

  @Get('payments-create-probe')
  @RequireEnterprisePermission('payments', 'create')
  paymentsCreateProbe() {
    return { ok: true };
  }
}

describe('Enterprise HTTP Guards (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [EnterpriseTestController],
      providers: [JwtStrategy, EnterpriseRbacGuard],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when no bearer token is provided', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/enterprise-test/probe')
      .expect(401);
  });

  it('returns 403 when token lacks enterprise role claim', async () => {
    const token = jwtService.sign({ sub: 'user-no-role' });

    await request(app.getHttpServer())
      .get('/api/v1/enterprise-test/probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('returns 403 when role exists but tenant/school scope is missing', async () => {
    const token = jwtService.sign({
      sub: 'user-director-no-scope',
      role: 'director',
    });

    await request(app.getHttpServer())
      .get('/api/v1/enterprise-test/probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('returns 200 when token includes role and scope claims', async () => {
    const token = jwtService.sign({
      sub: 'user-director-ok',
      role: 'director',
      schoolId: 'school-1',
      tenantId: 'tenant-1',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/enterprise-test/probe')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it('ignores conflicting x-enterprise-role header when token has role claim', async () => {
    const token = jwtService.sign({
      sub: 'user-director-scope',
      role: 'director',
      schoolId: 'school-1',
      tenantId: 'tenant-1',
    });

    await request(app.getHttpServer())
      .get('/api/v1/enterprise-test/payments-create-probe')
      .set('Authorization', `Bearer ${token}`)
      .set('x-enterprise-role', 'super_admin')
      .expect(403);
  });
});
