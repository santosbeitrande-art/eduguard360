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
    const appMetadata = payload.app_metadata || {};
    const applicationRole = payload.role && payload.role !== 'authenticated'
      ? payload.role
      : appMetadata.building360_role || appMetadata.role || null;
    const tenantId = payload.tenantId || payload.tenant_id || appMetadata.building360_tenant_id || appMetadata.tenant_id || null;
    const schoolId = payload.schoolId || payload.school_id || payload.escola_id || appMetadata.building360_school_id || appMetadata.school_id || null;
    // Decode per-product memberships from the JWT if present
    const memberships: Array<{ productId: string; organizationId: string; role: string }> =
      Array.isArray(payload.memberships) ? payload.memberships : [];

    return {
      sub: payload.sub,
      phone: payload.phone,
      name: payload.name || payload.user_metadata?.full_name || null,
      email: payload.email || null,
      role: applicationRole || payload.perfil || null,
      perfil: payload.perfil || applicationRole || null,
      schoolId,
      school_id: schoolId,
      escola_id: schoolId,
      tenantId,
      tenant_id: tenantId,
      building360_organization_id: appMetadata.building360_organization_id || null,
      building360_site_id: appMetadata.building360_site_id || null,
      building360_building_id: appMetadata.building360_building_id || null,
      memberships,  // per-product role array from JWT claims
    };
  }
}
