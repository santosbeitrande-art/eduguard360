import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionDomain } from '../rbac.matrix';

export const ENTERPRISE_PERMISSION_KEY = 'enterprise_permission';

export type EnterprisePermissionRequirement = {
  domain: PermissionDomain;
  action: PermissionAction;
};

export const RequireEnterprisePermission = (domain: PermissionDomain, action: PermissionAction) =>
  SetMetadata(ENTERPRISE_PERMISSION_KEY, { domain, action } as EnterprisePermissionRequirement);
