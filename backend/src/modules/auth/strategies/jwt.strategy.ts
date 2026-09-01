import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-key',
    });
  }

  validate(payload: any) {
    // Decode per-product memberships from the JWT if present
    const memberships: Array<{ productId: string; organizationId: string; role: string }> =
      Array.isArray(payload.memberships) ? payload.memberships : [];

    return {
      sub: payload.sub,
      phone: payload.phone,
      name: payload.name || null,
      email: payload.email || null,
      role: payload.role || payload.perfil || null,
      perfil: payload.perfil || payload.role || null,
      schoolId: payload.schoolId || payload.school_id || payload.escola_id || null,
      school_id: payload.school_id || payload.schoolId || payload.escola_id || null,
      escola_id: payload.escola_id || payload.schoolId || payload.school_id || null,
      tenantId: payload.tenantId || payload.tenant_id || null,
      tenant_id: payload.tenant_id || payload.tenantId || null,
      memberships,  // per-product role array from JWT claims
    };
  }
}
