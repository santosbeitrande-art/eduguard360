import { describe, expect, it } from 'vitest';
import { normalizeEnterpriseRole, resolvePortalRouteByRole } from './enterpriseGovernance';

describe('enterprise profile normalization', () => {
  it('normalizes legacy admin and parent profiles consistently', () => {
    expect(normalizeEnterpriseRole('admin')).toBe('admin');
    expect(normalizeEnterpriseRole('administrador geral')).toBe('super_admin');
    expect(normalizeEnterpriseRole('diretor')).toBe('director');
    expect(normalizeEnterpriseRole('seguranca operacional')).toBe('seguranca');
    expect(normalizeEnterpriseRole('pai')).toBe('parent');
  });

  it('routes each profile to a valid dashboard', () => {
    expect(resolvePortalRouteByRole('admin')).toBe('/sistema/admin');
    expect(resolvePortalRouteByRole('super_admin')).toBe('/sistema/admin');
    expect(resolvePortalRouteByRole('director')).toBe('/sistema/direcao');
    expect(resolvePortalRouteByRole('administrator')).toBe('/sistema/administracao');
    expect(resolvePortalRouteByRole('coordenador')).toBe('/sistema/coordenacao');
    expect(resolvePortalRouteByRole('secretaria')).toBe('/sistema/secretaria');
    expect(resolvePortalRouteByRole('professor')).toBe('/sistema/professor');
    expect(resolvePortalRouteByRole('financeiro')).toBe('/sistema/financeiro');
    expect(resolvePortalRouteByRole('rh')).toBe('/sistema/rh');
    expect(resolvePortalRouteByRole('seguranca')).toBe('/sistema/seguranca');
    expect(resolvePortalRouteByRole('parent')).toBe('/sistema/encarregado');
    expect(resolvePortalRouteByRole('student')).toBe('/sistema/aluno');
    expect(resolvePortalRouteByRole('enterprise')).toBe('/sistema/enterprise');
  });

  it('normalizes aliases and still grants profile route access', () => {
    const aliases = [
      'administrador geral',
      'diretor',
      'secretariat',
      'teacher',
      'hr',
      'security_officer',
      'guardian',
      'aluno',
    ];

    for (const alias of aliases) {
      const normalized = normalizeEnterpriseRole(alias);
      const route = resolvePortalRouteByRole(normalized);
      expect(normalized).not.toBe('unknown');
      expect(route).not.toBe('/sistema/login');
    }
  });
});
