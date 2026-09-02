import { SchoolDashboardPage } from './SchoolDashboard';

const AdministracaoDashboard = () => (
  <SchoolDashboardPage
    title="Painel de Administracao Escolar"
    description="Gestao administrativa escolar com controlo operacional, registros e acompanhamento institucional."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Fadministracao"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Fadministracao"
    allowedProfiles={['admin', 'super_admin', 'administrator']}
  />
);

export default AdministracaoDashboard;
