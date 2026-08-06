export type EnterprisePortal = 'enterprise' | 'parent' | 'student';

export type EnterpriseRole =
  | 'super_admin'
  | 'director'
  | 'administrator'
  | 'secretaria'
  | 'coordenador'
  | 'professor'
  | 'financeiro'
  | 'rh'
  | 'seguranca'
  | 'parent'
  | 'student'
  | 'unknown';

const aliases: Record<string, EnterpriseRole> = {
  admin: 'super_admin',
  superadmin: 'super_admin',
  school_admin: 'director',
  diretor: 'director',
  coordinator: 'coordenador',
  teacher: 'professor',
  scanner: 'seguranca',
  security: 'seguranca',
  pai: 'parent',
  encarregado: 'parent',
  aluno: 'student',
};

export const normalizeEnterpriseRole = (value: unknown): EnterpriseRole => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';

  const known = [
    'super_admin',
    'director',
    'administrator',
    'secretaria',
    'coordenador',
    'professor',
    'financeiro',
    'rh',
    'seguranca',
    'parent',
    'student',
  ];

  if (known.includes(normalized)) return normalized as EnterpriseRole;
  return aliases[normalized] || 'unknown';
};

export const resolvePortalByRole = (role: EnterpriseRole): EnterprisePortal => {
  if (role === 'parent') return 'parent';
  if (role === 'student') return 'student';
  return 'enterprise';
};

export const resolvePortalRouteByRole = (roleValue: unknown): string => {
  const role = normalizeEnterpriseRole(roleValue);
  const portal = resolvePortalByRole(role);

  if (portal === 'parent') return '/sistema/pais';
  if (portal === 'student') return '/cursos';
  return '/enterprise';
};

export const getRoleLabel = (roleValue: unknown): string => {
  const role = normalizeEnterpriseRole(roleValue);

  if (role === 'super_admin') return 'Super Administrador';
  if (role === 'director') return 'Diretor';
  if (role === 'administrator') return 'Administrador';
  if (role === 'secretaria') return 'Secretaria';
  if (role === 'coordenador') return 'Coordenador';
  if (role === 'professor') return 'Professor';
  if (role === 'financeiro') return 'Financeiro';
  if (role === 'rh') return 'RH';
  if (role === 'seguranca') return 'Seguranca';
  if (role === 'parent') return 'Encarregado';
  if (role === 'student') return 'Aluno';
  return 'Utilizador';
};

export const isEnterpriseRole = (roleValue: unknown): boolean => {
  const role = normalizeEnterpriseRole(roleValue);
  return role !== 'parent' && role !== 'student' && role !== 'unknown';
};

export const dataOwnershipByDomain = [
  { domain: 'Escola', owner: 'Super Administrador' },
  { domain: 'Diretor', owner: 'Super Administrador' },
  { domain: 'Cursos', owner: 'Diretor / Administracao' },
  { domain: 'Disciplinas', owner: 'Coordenador Academico' },
  { domain: 'Turmas', owner: 'Secretaria Academica' },
  { domain: 'Professores', owner: 'RH ou Diretor' },
  { domain: 'Alunos', owner: 'Secretaria' },
  { domain: 'Matriculas', owner: 'Secretaria' },
  { domain: 'Horarios', owner: 'Coordenacao' },
  { domain: 'Notas', owner: 'Professor' },
  { domain: 'Frequencia', owner: 'Professor' },
  { domain: 'Ocorrencias', owner: 'Professor / Seguranca' },
  { domain: 'Pagamentos', owner: 'Financeiro' },
  { domain: 'Funcionarios', owner: 'RH' },
  { domain: 'Documentos', owner: 'Secretaria' },
  { domain: 'QR Aluno', owner: 'Sistema automatico' },
];
