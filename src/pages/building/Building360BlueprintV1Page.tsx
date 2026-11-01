import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Layers3, LockKeyhole, Server, Workflow } from 'lucide-react';
import {
  isApprovedByAdmin,
  isBuilding360ManagementProfile,
  isBuilding360ResidentProfile,
  resolveBuilding360Profile,
} from '@/lib/building360Access';

const coreEntities = [
  'organizations',
  'portfolios',
  'sites',
  'buildings',
  'floors',
  'units',
  'people',
  'users',
  'organizations_people',
  'roles',
];

const operationsEntities = [
  'buildingpass_credentials',
  'community_announcements',
  'community_threads',
  'requests',
  'complaints',
  'assets',
  'maintenance_plans',
  'work_orders',
  'inspections',
  'incidents',
  'vehicles',
  'parking_spaces',
  'visitors',
  'documents',
  'vendors',
];

const financeEntities = [
  'contracts',
  'leases',
  'charges',
  'invoices',
  'payments',
  'receipts',
  'expenses',
  'budgets',
  'budget_lines',
  'ledger_entries',
  'reserve_bookings',
  'move_authorizations',
];

const endpoints = [
  ['GET', '/api/v1/building360/overview', 'Resumo operacional por tenant', 'Rota no controller; operação não certificada'],
  ['GET', '/api/v1/building360/sites', 'Lista de sites e complexos', 'Rota no controller; operação não certificada'],
  ['GET', '/api/v1/building360/buildings', 'Lista de edifícios por site', 'Rota no controller; operação não certificada'],
  ['GET', '/api/v1/building360/units', 'Unidades por filtros (tipo, estado, edifício)', 'Rota no controller; operação não certificada'],
  ['GET', '/api/v1/building360/core/people', 'Base de pessoas do condomínio/comunidade', 'Rota no controller; operação não certificada'],
  ['GET', '/api/v1/building360/core/role-assignments', 'Atribuições de perfil', 'Rota no controller; não equivale a BuildingPass'],
  ['GET', '/api/v1/building360/assets', 'Activos e próxima manutenção', 'Rota no controller; operação não certificada'],
  ['POST', '/api/v1/building360/work-orders', 'Criar ordem de trabalho', 'Rota no controller; ciclo completo não certificado'],
  ['PATCH', '/api/v1/building360/work-orders/:id', 'Actualizar estado de manutenção', 'Rota no controller; ciclo completo não certificado'],
  ['POST', '/api/v1/building360/core/role-assignments', 'Criar atribuição de perfil', 'Rota no controller; não emite credenciais de visitante'],
  ['POST', '/api/v1/building360/billing/run', 'Executar ciclo de cobrança', 'Rota no controller; fluxo financeiro não certificado'],
  ['GET', '/api/v1/building360/finance/invoices', 'Facturas por contrato/unidade', 'Rota no controller; operação não certificada'],
  ['POST', '/api/v1/building360/finance/payments/register', 'Registar pagamento e emitir recibo', 'Implementado; confirmado no sistema, não confirmado por banco'],
  ['GET', '/api/v1/building360/finance/ledger', 'Consultar movimentos do tenant', 'Implementado; scope por tenant'],
  ['POST', '/api/v1/building360/finance/expenses', 'Registar despesa no livro financeiro', 'Implementado; comprovativo guardado apenas como referência, sem upload de ficheiro'],
  ['POST', '/api/v1/building360/finance/opening-balances', 'Registar saldo inicial ou dívida histórica', 'Implementado; dívida cria fatura pagável associada a unidade/contrato; saldo não é bancário'],
  ['POST', '/api/v1/building360/finance/bank-reconciliations', 'Conciliar pagamento com linha do extrato', 'Implementado para correspondência manual exacta; sem integração/importação bancária automática'],
  ['POST', '/api/v1/building360/public/demo-requests', 'Receber pedido comercial de demonstração', 'Implementado no código; pendente de migração e validação em produção'],
  ['GET', '/api/v1/building360/admin/demo-requests', 'Consultar pedidos de demonstração', 'Implementado; reservado a super_admin/platform_admin'],
  ['POST', '/api/v1/building360/admin/demo-requests/:id/approve', 'Aprovar pedido, criar tenant e convidar administrador', 'Implementado no código; depende de credenciais Supabase server-side e migração aplicada'],
  ['POST', '/api/v1/building360/admin/demo-requests/:id/reject', 'Rejeitar pedido comercial pendente', 'Implementado; decisão registada em auditoria'],
  ['POST', '/api/v1/building360/visitors', 'Registar visitante', 'Planeado; rota não localizada no controller'],
  ['POST', '/api/v1/building360/core/organizations', 'Criar organização no tenant autenticado', 'Rota no controller; tenant vem do âmbito autenticado'],
  ['POST', '/api/v1/building360/core/sites', 'Criar condomínio/site', 'Rota no controller; operação não certificada'],
  ['POST', '/api/v1/building360/core/buildings', 'Criar edifício associado ao site', 'Rota no controller; operação não certificada'],
  ['POST', '/api/v1/building360/core/units', 'Criar unidade associada ao edifício', 'Rota no controller; operação não certificada'],
  ['POST', '/api/v1/building360/core/people', 'Registar ficha de pessoa', 'Rota no controller; não cria conta nem envia convite'],
  ['POST', '/api/v1/building360/finance/contracts', 'Criar contrato de cobrança', 'Rota no controller; não emite fatura automaticamente'],
];

const permissionRows = [
  ['Platform Admin', 'Global', 'Todos os modulos Building360', 'Controlo total multi-tenant'],
  ['Organization Admin', 'Tenant', 'Core, Property, Finance, Operations, Security', 'CRUD completo + aprovacoes'],
  ['Property Manager', 'Tenant', 'Property Management, People', 'CRUD operacional de portfolio'],
  ['Finance Manager', 'Tenant', 'Finance360', 'Cobranca, pagamentos, reconciliacao, exportacao'],
  ['Maintenance Manager', 'Tenant', 'Asset360, Maintain360', 'Activos, planos e ordens de trabalho'],
  ['Security Manager', 'Tenant', 'BuildingPass, Security & Incident', 'Politicas, incidentes, auditoria'],
  ['Security Officer', 'Tenant/Assigned', 'BuildingPass, Incident', 'Operacao de acesso e ocorrencias'],
  ['Facility Manager', 'Tenant', 'Property, Asset, Operations', 'Gestao operacional transversal'],
  ['Community Manager', 'Tenant', 'People & Community', 'Comunicacao, reclamacoes, assembleias'],
  ['Document Manager', 'Tenant', 'Document360', 'Governanca documental e validade'],
  ['Parking Manager', 'Tenant', 'Parking360', 'Vagas, reservas, entradas e saidas'],
  ['Technician', 'Tenant/Assigned', 'Maintain360', 'Execucao de ordens atribuidas'],
  ['Resident / Occupant', 'Self + linked unit', 'Unit, access, notices, invoices', 'Consulta e pedidos autorizados'],
  ['Auditor', 'Tenant/Scoped', 'Security, Finance, Logs', 'Leitura e exportacao para auditoria'],
];

const Building360BlueprintV1Page: React.FC = () => {
  const navigate = useNavigate();
  const [accessValidated, setAccessValidated] = useState(false);

  useEffect(() => {
    let currentUser: Record<string, unknown> | null = null;
    for (const key of ['currentUser', 'eduguard_user', 'user']) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          currentUser = parsed as Record<string, unknown>;
          break;
        }
      } catch {
        continue;
      }
    }

    const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token');
    if (!currentUser || !token || !isApprovedByAdmin(currentUser)) {
      navigate('/building360/login?returnTo=%2Fbuilding360%2Fblueprint', { replace: true });
      return;
    }

    const profile = resolveBuilding360Profile(
      String(currentUser.building360_role || currentUser.perfil || currentUser.role || ''),
    );
    if (isBuilding360ResidentProfile(profile)) {
      navigate('/building360/morador', { replace: true });
      return;
    }
    if (!isBuilding360ManagementProfile(profile)) {
      navigate('/portais', { replace: true });
      return;
    }
    setAccessValidated(true);
  }, [navigate]);

  if (!accessValidated) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <button
          onClick={() => navigate('/building360')}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Building360
        </button>

        <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-7 sm:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300 mb-3">Blueprint de Desenvolvimento</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white">Building360 V1 Blueprint</h1>
          <p className="mt-4 text-slate-300 max-w-3xl">
            Versao detalhada para inicio de implementacao: modelo de dados PostgreSQL, mapa de APIs,
            permissões por perfil e estrutura modular para um monolito modular multi-tenant.
          </p>
          <p className="mt-3 text-sm text-cyan-200">
            Produto independente: Building360 partilha identidade/RBAC do ecossistema, mas opera com dominios proprios e isolamento estrito por tenant.
          </p>
          <p className="mt-2 text-sm text-emerald-200">
            Regra obrigatoria de arquitetura: identidade unica Building360 com RBAC por perfil; sem logins separados por modulo.
          </p>
          <div className="mt-5 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm leading-relaxed text-amber-100">
            Estado verificado no código: há entidades TypeORM e rotas no controller para parte do
            núcleo, manutenção e cobrança. A existência de uma rota ou entidade não prova que o
            fluxo esteja completo, validado ponta a ponta ou pronto para produção. Os restantes
            elementos abaixo são desenho/planeamento. Documentação interna para utilizadores
            autorizados.
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            O onboarding de edifício cria registos dentro de um tenant já atribuído. O pedido
            comercial, a aprovação manual, o provisionamento inicial de tenant e o convite Supabase
            existem no código, mas não foram validados com as credenciais e base de dados de produção.
            Despesas, saldo inicial, dívida histórica faturável e conciliação manual de pagamentos estão disponíveis no
            livro financeiro. A referência de comprovativo não faz upload de ficheiro e a
            conciliação não consulta o banco. A validação da sessão Supabase usa o endpoint oficial
            de utilizador, e o backend só aceita papel/tenant vindos de app_metadata administrada
            pelo servidor; ainda é necessário testar o ciclo completo de aceitação do convite.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Antes de activar os pedidos em produção: aplicar a migration
            <code className="mx-1 text-sky-200">CreateBuilding360DemoRequests</code>
            e configurar no backend <code className="mx-1 text-sky-200">SUPABASE_URL</code>,
            <code className="mx-1 text-sky-200">SUPABASE_SERVICE_ROLE_KEY</code>,
            uma chave pública para validar sessões e um redirect de convite permitido no Supabase.
            A chave de serviço nunca deve ser exposta no frontend.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-bold text-white">Ecossistema Integrado</h2>
          <p className="mt-3 text-sm text-slate-300">
            CORE + BuildingPass + Community360 + Chat360 + Request360 + Complaint360 + Finance360 + Asset360 + Maintain360 + Parking360 + Reserve360 + Move360 + Document360 + Security360 + Insight360 + Building Intelligence.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Cada evento operacional deve ligar-se ao contexto de unidade, edificio e tenant para gerar rastreabilidade ponta-a-ponta.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-bold text-white inline-flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-300" />
              Core Data Model
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {coreEntities.map((entity) => (
                <li key={entity} className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2">{entity}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-bold text-white inline-flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-300" />
              Operations & Security
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {operationsEntities.map((entity) => (
                <li key={entity} className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2">{entity}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-bold text-white inline-flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-amber-300" />
              Finance & Billing
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {financeEntities.map((entity) => (
                <li key={entity} className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2">{entity}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 overflow-x-auto">
          <h2 className="text-xl font-bold text-white inline-flex items-center gap-2">
            <Server className="w-5 h-5 text-violet-300" />
            API Endpoints V1
          </h2>
          <table className="w-full mt-4 text-left text-sm min-w-[760px]">
            <thead>
              <tr className="text-slate-300 border-b border-slate-700">
                <th className="py-2 pr-4">Metodo</th>
                <th className="py-2 pr-4">Endpoint</th>
                <th className="py-2 pr-4">Objectivo</th>
                <th className="py-2">Estado verificado</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(([method, path, purpose, status]) => (
                <tr key={path} className="border-b border-slate-800/60 text-slate-200">
                  <td className="py-2 pr-4 font-semibold text-sky-300">{method}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{path}</td>
                  <td className="py-2 pr-4">{purpose}</td>
                  <td className="py-2 text-xs text-slate-300">{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 overflow-x-auto">
          <h2 className="text-xl font-bold text-white inline-flex items-center gap-2">
            <LockKeyhole className="w-5 h-5 text-rose-300" />
            Permissoes por Perfil (RBAC)
          </h2>
          <table className="w-full mt-4 text-left text-sm min-w-[760px]">
            <thead>
              <tr className="text-slate-300 border-b border-slate-700">
                <th className="py-2 pr-4">Perfil</th>
                <th className="py-2 pr-4">Escopo</th>
                <th className="py-2 pr-4">Modulos</th>
                <th className="py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {permissionRows.map(([role, scope, modules, actions]) => (
                <tr key={role} className="border-b border-slate-800/60 text-slate-200">
                  <td className="py-2 pr-4 font-semibold">{role}</td>
                  <td className="py-2 pr-4">{scope}</td>
                  <td className="py-2 pr-4">{modules}</td>
                  <td className="py-2">{actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 rounded-2xl border border-emerald-700/40 bg-emerald-900/10 p-6">
          <h3 className="text-lg font-bold text-emerald-300">Stack recomendado</h3>
          <p className="text-sm text-slate-300 mt-2">
            Frontend Next.js + TypeScript, backend NestJS, PostgreSQL, Redis, object storage S3-compatible,
            deploy com Docker e CI/CD. Estrategia inicial: monolito modular evoluindo para servicos dedicados por dominio.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/building360"
              className="px-5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Voltar ao Portal
            </Link>
            <a
              href="/#adesao"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-semibold"
            >
              Solicitar demonstracao
            </a>
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Estado do modelo de dados: estão presentes entidades TypeORM para organizations,
          portfolios, sites, buildings, floors, units, people, role assignments, assets,
          work orders, contracts, charges, invoices, payments, receipts e ledger entries.
          As demais entidades/tabelas enumeradas neste blueprint são propostas. A presença
          de uma entidade não confirma migração aplicada, dados de produção nem um processo
          operacional completo. As permissões acima são o modelo de referência; validar
          autorização por rota e perfil antes de disponibilizar cada fluxo.
        </p>
      </div>
    </div>
  );
};

export default Building360BlueprintV1Page;
