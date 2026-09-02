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
  admin: 'admin',
  'admin geral': 'super_admin',
  superadmin: 'super_admin',
  super_admin: 'super_admin',
  administrador: 'super_admin',
  administracao: 'super_admin',
  'administrador geral': 'super_admin',
  platform_admin: 'admin',
  school_admin: 'director',
  diretor: 'director',
  direcao: 'director',
  direcao_escolar: 'director',
  'direção': 'director',
  'direcao escolar': 'director',
  coordinator: 'coordenador',
  coordenador: 'coordenador',
  coordenacao: 'coordenador',
  'coordenação': 'coordenador',
  'coordenacao academica': 'coordenador',
  teacher: 'professor',
  professor: 'professor',
  docente: 'professor',
  secretaria: 'secretaria',
  secretariat: 'secretaria',
  secretariado: 'secretaria',
  hr: 'rh',
  finance: 'financeiro',
  financeiro: 'financeiro',
  financas: 'financeiro',
  rh: 'rh',
  'recursos humanos': 'rh',
  'human resources': 'rh',
  scanner: 'seguranca',
  security: 'seguranca',
  security_officer: 'seguranca',
  seguranca: 'seguranca',
  segurança: 'seguranca',
  'seguranca operacional': 'seguranca',
  'segurança operacional': 'seguranca',
  'seguranca operacional / qr code': 'seguranca',
  'seguranca operacional qr code': 'seguranca',
  'security officer': 'seguranca',
  'seguranca qr code': 'seguranca',
  pai: 'parent',
  encarregado: 'parent',
  guardian: 'parent',
  parent: 'parent',
  aluno: 'student',
  student: 'student',
  administrador_escolar: 'administrator',
  'administrador escolar': 'administrator',
  administrator: 'administrator',
};

export const normalizeEnterpriseRole = (value: unknown): EnterpriseRole => {
  const raw = String(value ?? '').trim();
  if (!raw) return 'unknown';

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\//g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized === 'admin') return 'admin';
  if (normalized === 'super_admin' || normalized === 'superadmin') return 'super_admin';

  const known = [
    'enterprise',
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

  const directAlias = aliases[normalized];
  if (directAlias) return directAlias;

  const aliasWithUnderscore = aliases[normalized.replace(/\s+/g, '_')];
  if (aliasWithUnderscore) return aliasWithUnderscore;

  const compact = normalized.replace(/\s+/g, '');
  const compactAlias = Object.entries(aliases).find(([key]) => key.replace(/\s+/g, '') === compact);
  if (compactAlias) return compactAlias[1];

  return 'unknown';
};

export const resolvePortalByRole = (role: EnterpriseRole): EnterprisePortal => {
  if (role === 'parent') return 'parent';
  if (role === 'student') return 'student';
  return 'enterprise';
};

export const resolvePortalRouteByRole = (roleValue: unknown): string => {
  const role = normalizeEnterpriseRole(roleValue);
  if (role === 'enterprise') return '/sistema/enterprise';
  if (role === 'super_admin' || role === 'admin') return '/sistema/admin';
  if (role === 'parent') return '/sistema/encarregado';
  if (role === 'student') return '/sistema/aluno';
  if (role === 'seguranca') return '/sistema/seguranca';
  if (role === 'director') return '/sistema/direcao';
  if (role === 'administrator') return '/sistema/administracao';
  if (role === 'secretaria') return '/sistema/secretaria';
  if (role === 'coordenador') return '/sistema/coordenacao';
  if (role === 'professor') return '/sistema/professor';
  if (role === 'financeiro') return '/sistema/financeiro';
  if (role === 'rh') return '/sistema/rh';
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
