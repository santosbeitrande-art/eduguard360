import { normalizeRole, buildPermissionsByRole } from './businessApiProxy.js';

const roleWorkspaceCatalog = {
  director: {
    label: 'Direcao',
    route: '/sistema/direcao',
    portal: 'school',
    title: 'Workspace da Direcao',
    description: 'Visao executiva, governanca institucional e acompanhamento estrategico da escola.',
    modules: [
      { slug: 'visao-geral', title: 'Visao Geral', domain: 'schools', description: 'Panorama institucional, desempenho e indicadores operacionais.' },
      { slug: 'gestao-escolar', title: 'Gestao Escolar', domain: 'students', description: 'Supervisao de alunos, turmas e fluxos academicos.' },
      { slug: 'relatorios-analytics', title: 'Relatorios e Analytics', domain: 'analytics', description: 'Consultas e exportacao de relatorios estrategicos da direcao.' },
      { slug: 'auditoria-governance', title: 'Auditoria e Governance', domain: 'security', description: 'Auditoria de eventos criticos e governanca institucional.' },
    ],
  },
  administrator: {
    label: 'Administracao Escolar',
    route: '/sistema/administracao',
    portal: 'school',
    title: 'Workspace da Administracao Escolar',
    description: 'Operacao administrativa com foco em cadastros, matriculas e documentacao autorizada.',
    modules: [
      { slug: 'estudantes', title: 'Estudantes', domain: 'students', description: 'Cadastro e manutencao administrativa de estudantes.' },
      { slug: 'turmas-matriculas', title: 'Turmas e Matriculas', domain: 'enrollments', description: 'Gestao de turmas e processos de matricula.' },
      { slug: 'documentacao', title: 'Documentacao', domain: 'documents', description: 'Gestao de documentos institucionais autorizados.' },
      { slug: 'utilizadores-escola', title: 'Utilizadores da Escola', domain: 'users', description: 'Controlo administrativo de utilizadores da escola.' },
    ],
  },
  secretaria: {
    label: 'Secretaria Academica',
    route: '/sistema/secretaria',
    portal: 'school',
    title: 'Workspace da Secretaria',
    description: 'Processos administrativos e academicos centrados em alunos, matriculas e documentos.',
    modules: [
      { slug: 'alunos-inscricoes', title: 'Alunos e Inscricoes', domain: 'students', description: 'Registo de alunos e inscricoes academicas.' },
      { slug: 'matriculas', title: 'Matriculas', domain: 'enrollments', description: 'Fluxo administrativo de matriculas e transferencias.' },
      { slug: 'turmas-horarios', title: 'Turmas e Horarios', domain: 'classes', description: 'Consulta operacional de turmas e horarios.' },
      { slug: 'documentos', title: 'Documentos', domain: 'documents', description: 'Declaracoes, certidoes e documentacao academica.' },
    ],
  },
  coordenador: {
    label: 'Coordenacao Academica',
    route: '/sistema/coordenacao',
    portal: 'school',
    title: 'Workspace da Coordenacao Academica',
    description: 'Planeamento curricular, monitoria pedagogica e articulacao docente.',
    modules: [
      { slug: 'disciplinas-curriculo', title: 'Disciplinas e Curriculo', domain: 'disciplines', description: 'Gestao curricular e estrutura de disciplinas.' },
      { slug: 'planeamento-academico', title: 'Planeamento Academico', domain: 'workflow', description: 'Planeamento e governanca academica.' },
      { slug: 'horarios', title: 'Horarios', domain: 'schedule', description: 'Construcao e ajuste de horarios escolares.' },
      { slug: 'professores', title: 'Professores', domain: 'teachers', description: 'Acompanhamento pedagogico do corpo docente.' },
    ],
  },
  professor: {
    label: 'Professor',
    route: '/sistema/professor',
    portal: 'school',
    title: 'Workspace do Professor',
    description: 'Gestao de turmas, frequencia, avaliacoes e ocorrencias pedagogicas.',
    modules: [
      { slug: 'minhas-turmas', title: 'Minhas Turmas', domain: 'classes', description: 'Consulta das turmas atribuidas ao docente.' },
      { slug: 'frequencia', title: 'Frequencia', domain: 'attendance', description: 'Registo e atualizacao de frequencia dos alunos.' },
      { slug: 'avaliacoes-notas', title: 'Avaliacoes e Notas', domain: 'grades', description: 'Lancamento de avaliacoes e notas.' },
      { slug: 'ocorrencias-pedagogicas', title: 'Ocorrencias Pedagogicas', domain: 'incidents', description: 'Ocorrencias e comunicacao pedagogica com evidencias.' },
    ],
  },
  financeiro: {
    label: 'Financeiro',
    route: '/sistema/financeiro',
    portal: 'school',
    title: 'Workspace Financeiro',
    description: 'Cobranca, pagamentos, reconciliacao e relatorios financeiros da escola.',
    modules: [
      { slug: 'mensalidades-pagamentos', title: 'Mensalidades e Pagamentos', domain: 'payments', description: 'Cobrancas, recebimentos e conciliacao financeira.' },
      { slug: 'faturas-recibos', title: 'Faturas e Recibos', domain: 'payments', description: 'Emissao e consulta de faturas e recibos.' },
      { slug: 'dividas-bolsas', title: 'Dividas e Bolsas', domain: 'payments', description: 'Gestao de bolsas, descontos e dividas.' },
      { slug: 'relatorios-financeiros', title: 'Relatorios Financeiros', domain: 'payments', description: 'Indicadores financeiros e exportacao de relatorios.' },
    ],
  },
  rh: {
    label: 'Recursos Humanos',
    route: '/sistema/rh',
    portal: 'school',
    title: 'Workspace de Recursos Humanos',
    description: 'Gestao de colaboradores, contratos, desempenho e documentacao de RH.',
    modules: [
      { slug: 'colaboradores', title: 'Colaboradores', domain: 'employees', description: 'Cadastro e gestao de colaboradores.' },
      { slug: 'contratos-documentacao', title: 'Contratos e Documentacao', domain: 'documents', description: 'Contratos e arquivos administrativos de RH.' },
      { slug: 'ferias-avaliacoes', title: 'Ferias e Avaliacoes', domain: 'employees', description: 'Controlo de ferias e avaliacoes de desempenho.' },
      { slug: 'formacao', title: 'Formacao', domain: 'employees', description: 'Planeamento e monitoria de formacao interna.' },
    ],
  },
  seguranca: {
    label: 'Seguranca Operacional / QR Code',
    route: '/sistema/seguranca',
    portal: 'security',
    title: 'Workspace de Seguranca Operacional',
    description: 'Operacao de controlo de acessos e eventos de seguranca por QR Code.',
    modules: [
      { slug: 'scanner-qr', title: 'Scanner QR', domain: 'qr', description: 'Leitura de QR e registo de entradas/saidas no escopo autorizado.' },
      { slug: 'acessos-do-dia', title: 'Acessos do Dia', domain: 'security', description: 'Consulta operacional de movimentos e conformidade diaria.' },
      { slug: 'ocorrencias-seguranca', title: 'Ocorrencias de Seguranca', domain: 'incidents', description: 'Registo e acompanhamento de ocorrencias operacionais.' },
    ],
  },
};

const supportedProfiles = new Set(Object.keys(roleWorkspaceCatalog));

export const getRoleWorkspaceCatalog = (profileInput) => {
  const profile = normalizeRole(profileInput);
  if (!supportedProfiles.has(profile)) return null;

  const def = roleWorkspaceCatalog[profile];
  const permissions = buildPermissionsByRole(profile);
  const allowedRoutePrefixes = [String(def.route || '').trim()].filter(Boolean);

  return {
    profile,
    label: def.label,
    route: def.route,
    portal: def.portal,
    title: def.title,
    description: def.description,
    modules: def.modules,
    permissions,
    allowedRoutePrefixes,
  };
};

export const getSupportedWorkspaceProfiles = () => Array.from(supportedProfiles.values());
