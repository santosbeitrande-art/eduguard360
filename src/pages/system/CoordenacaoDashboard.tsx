import { SchoolDashboardPage } from './SchoolDashboard';

const CoordenacaoDashboard = () => (
  <SchoolDashboardPage
    title="Painel de Coordenacao"
    description="Acompanhamento academico da coordenacao com foco em turmas, desempenho e rotinas pedagogicas."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Fcoordenacao"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Fcoordenacao"
    allowedProfiles={['admin', 'super_admin', 'coordenador']}
  />
);

export default CoordenacaoDashboard;
