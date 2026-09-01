import { SchoolDashboardPage } from './SchoolDashboard';

const FinanceiroDashboard = () => (
  <SchoolDashboardPage
    title="Painel Financeiro"
    description="Cobrança, pagamentos, faturas e acompanhamento financeiro da escola."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Ffinanceiro"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Ffinanceiro"
    allowedProfiles={['admin', 'super_admin', 'director', 'administrator', 'financeiro']}
  />
);

export default FinanceiroDashboard;
