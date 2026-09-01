import { SchoolDashboardPage } from './SchoolDashboard';

const SecretariaDashboard = () => (
  <SchoolDashboardPage
    title="Painel da Secretaria"
    description="Registo, matrícula, documentação e acompanhamento administrativo da secretaria académica."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Fsecretaria"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Fsecretaria"
    allowedProfiles={['admin', 'super_admin', 'secretaria']}
  />
);

export default SecretariaDashboard;
