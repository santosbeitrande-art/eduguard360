import { getRolePermissions, normalizeEnterpriseRole } from './rbac.matrix';

describe('Enterprise RBAC matrix for Building360 roles', () => {
  it('maps gatekeeper aliases to security_officer role', () => {
    expect(normalizeEnterpriseRole('porteiro')).toBe('security_officer');
    expect(normalizeEnterpriseRole('security_officer')).toBe('security_officer');
  });

  it('maps finance manager aliases and keeps payment authority', () => {
    expect(normalizeEnterpriseRole('finance_manager')).toBe('finance_manager');
    const permissions = getRolePermissions('finance_manager');
    expect(permissions.payments).toEqual(
      expect.arrayContaining(['create', 'read', 'update', 'approve', 'export'])
    );
  });

  it('denies payment create capability for security officer', () => {
    const permissions = getRolePermissions('security_officer');
    expect(permissions.payments).not.toContain('create');
    expect(permissions.qr).toEqual(expect.arrayContaining(['create', 'read', 'update']));
  });

  it('keeps auditor read/export posture only', () => {
    const permissions = getRolePermissions('auditor');
    expect(permissions.security).toEqual(expect.arrayContaining(['read', 'export']));
    expect(permissions.security).not.toContain('update');
    expect(permissions.workflow).not.toContain('approve');
  });
});
