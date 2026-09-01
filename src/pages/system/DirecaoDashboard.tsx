import { SchoolDashboardPage } from './SchoolDashboard';

const DirecaoDashboard = () => (
  <SchoolDashboardPage
    title="Painel da Direção"
    description="Visão operacional e académica da direção com foco em monitorização, controlo e apoio à gestão escolar."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Fdirecao"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Fdirecao"
    allowedProfiles={['admin', 'super_admin', 'director', 'administrator']}
  />
);

export default DirecaoDashboard;
