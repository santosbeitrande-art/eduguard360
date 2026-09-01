export type EnterprisePortal = 'enterprise' | 'parent' | 'student';

export type EnterpriseRole =
  | 'enterprise'
  | 'admin'
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
  enterprise: 'enterprise',
  admin: 'super_admin',
  superadmin: 'super_admin',
  platform_admin: 'admin',
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
    'enterprise',
    'admin',
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
  if (role === 'enterprise' || role === 'super_admin') return '/sistema/enterprise';
  if (role === 'admin') return '/sistema/admin';
  if (role === 'parent') return '/sistema/encarregado';
  if (role === 'student') return '/sistema/aluno';
  if (role === 'seguranca') return '/sistema/seguranca';
  if (role === 'director') return '/sistema/direcao';
  if (role === 'secretaria') return '/sistema/secretaria';
  if (role === 'professor') return '/sistema/professor';
  if (role === 'financeiro') return '/sistema/financeiro';
  if (role === 'administrator' || role === 'coordenador' || role === 'rh') return '/sistema/escola';
  return '/sistema/login';
};

export const getRoleLabel = (roleValue: unknown): string => {
  const role = normalizeEnterpriseRole(roleValue);

  if (role === 'super_admin') return 'Administração Geral';
  if (role === 'director') return 'Direção';
  if (role === 'administrator') return 'Administração Escolar';
  if (role === 'secretaria') return 'Secretaria Académica';
  if (role === 'coordenador') return 'Coordenação Académica';
  if (role === 'professor') return 'Professor';
  if (role === 'financeiro') return 'Gestão Financeira';
  if (role === 'rh') return 'Recursos Humanos';
  if (role === 'seguranca') return 'Segurança Operacional';
  if (role === 'parent') return 'Encarregado';
  if (role === 'student') return 'Aluno';
  return 'Utilizador';
};

export const isEnterpriseRole = (roleValue: unknown): boolean => {
  const role = normalizeEnterpriseRole(roleValue);
  return role === 'enterprise' || role === 'admin' || role === 'super_admin';
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
