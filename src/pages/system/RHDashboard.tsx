import { SchoolDashboardPage } from './SchoolDashboard';

const RHDashboard = () => (
  <SchoolDashboardPage
    title="Painel de Recursos Humanos"
    description="Gestao de recursos humanos da escola com acompanhamento de colaboradores e rotinas internas."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Frh"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Frh"
    allowedProfiles={['admin', 'super_admin', 'rh']}
  />
);

export default RHDashboard;
