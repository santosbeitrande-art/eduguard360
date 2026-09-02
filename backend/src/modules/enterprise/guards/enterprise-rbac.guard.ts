import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  EnterpriseRole,
  getRolePermissions,
  normalizeEnterpriseRole,
} from '../rbac.matrix';
import {
  ENTERPRISE_PERMISSION_KEY,
  EnterprisePermissionRequirement,
} from '../decorators/enterprise-permission.decorator';

export type EnterprisePrincipal = {
  role: EnterpriseRole;
  userId: string | null;
  userName: string | null;
  schoolId: string | null;
  tenantId: string | null;
};

@Injectable()
export class EnterpriseRbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<any>();
    const principal = this.resolvePrincipal(request);

    if (principal.role === 'unknown') {
      throw new ForbiddenException('Role is required for enterprise endpoints.');
    }

    if (principal.role !== 'super_admin' && !principal.schoolId && !principal.tenantId) {
      throw new ForbiddenException('Tenant scope is required for this role.');
    }

    request.enterprisePrincipal = principal;

    const requirement = this.reflector.getAllAndOverride<EnterprisePermissionRequirement>(
      ENTERPRISE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) return true;

    const permissions = getRolePermissions(principal.role);
    const allowed = permissions[requirement.domain] || [];
    if (!allowed.includes(requirement.action)) {
      throw new ForbiddenException(
        `Role ${principal.role} cannot ${requirement.action} on ${requirement.domain}.`,
      );
    }

    return true;
  }

  private resolvePrincipal(request: any): EnterprisePrincipal {
    const body = request?.body || {};
    const query = request?.query || {};
    const headers = request?.headers || {};
    const user = request?.user || {};

    const hasJwtSubject = Boolean(this.normalizeValue(user.sub || user.id));
    const tokenRole = this.normalizeValue(user.role || user.perfil);
    const tokenSchoolId = this.normalizeValue(user.schoolId || user.school_id || user.escola_id);
    const tokenTenantId = this.normalizeValue(user.tenantId || user.tenant_id);
    const tokenUserName = this.normalizeValue(user.name || user.nome);
    const tokenUserId = this.normalizeValue(user.sub || user.id);

    // Once JwtAuthGuard authenticates a subject, trust only token claims for role/scope.
    const useTokenClaimsOnly = hasJwtSubject;

    const role = normalizeEnterpriseRole(
      useTokenClaimsOnly
        ? tokenRole
        : user.role ||
            user.perfil ||
            headers['x-enterprise-role'] ||
            body.role ||
            body.actorRole ||
            query.role,
    );

    const schoolId = this.normalizeValue(
      useTokenClaimsOnly
        ? tokenSchoolId
        : user.schoolId ||
            user.school_id ||
            user.escola_id ||
            headers['x-school-id'] ||
            body.schoolId ||
            body.school_id ||
            body.escola_id ||
            query.schoolId,
    );

    const tenantId = this.normalizeValue(
      useTokenClaimsOnly
        ? tokenTenantId || tokenSchoolId
        : user.tenantId ||
            user.tenant_id ||
            headers['x-tenant-id'] ||
            body.tenantId ||
            body.tenant_id ||
            query.tenantId,
    );

    const userId = this.normalizeValue(
      useTokenClaimsOnly
        ? tokenUserId
        : user.sub ||
            user.id ||
            body.userId ||
            body.actorId ||
            query.userId ||
            headers['x-user-id'],
    );

    const userName = this.normalizeValue(
      useTokenClaimsOnly
        ? tokenUserName
        : user.name ||
            user.nome ||
            body.userName ||
            body.actorName ||
            headers['x-user-name'],
    );

    return {
      role,
      schoolId,
      tenantId: tenantId || schoolId,
      userId,
      userName,
    };
  }

  private normalizeValue(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized.length > 0 ? normalized : null;
  }
}
