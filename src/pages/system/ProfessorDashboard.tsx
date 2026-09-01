import { SchoolDashboardPage } from './SchoolDashboard';

const ProfessorDashboard = () => (
  <SchoolDashboardPage
    title="Painel do Professor"
    description="Consulta de turmas, assiduidade, avaliações e ocorrências pedagógicas associadas ao docente."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Fprofessor"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Fprofessor"
    allowedProfiles={['admin', 'super_admin', 'director', 'administrator', 'professor']}
  />
);

export default ProfessorDashboard;
