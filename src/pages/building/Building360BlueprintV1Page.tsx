import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Layers3, LockKeyhole, Server, Workflow } from 'lucide-react';

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
];

const endpoints = [
  ['GET', '/api/v1/building360/overview', 'Resumo operacional por tenant'],
  ['GET', '/api/v1/building360/sites', 'Lista de sites e complexos'],
  ['GET', '/api/v1/building360/buildings', 'Lista de edificios por site'],
  ['GET', '/api/v1/building360/units', 'Unidades por filtros (tipo, estado, edificio)'],
  ['GET', '/api/v1/building360/assets', 'Activos e proxima manutencao'],
  ['POST', '/api/v1/building360/work-orders', 'Criar ordem de trabalho'],
  ['PATCH', '/api/v1/building360/work-orders/:id', 'Actualizar estado de manutencao'],
  ['POST', '/api/v1/building360/visitors', 'Registar visitante e gerar QR'],
  ['GET', '/api/v1/building360/access/logs', 'Logs de acesso BuildingPass'],
  ['POST', '/api/v1/building360/billing/run', 'Executar ciclo de cobranca'],
  ['GET', '/api/v1/building360/invoices', 'Facturas por contrato/unidade'],
  ['POST', '/api/v1/building360/payments', 'Registar pagamento e emitir recibo'],
];

const permissionRows = [
  ['Platform Admin', 'Global', 'Tudo', 'Tudo'],
  ['Admin Portal', 'Tenant', 'Core, Finance, Ops, Security', 'CRUD completo + aprovacoes'],
  ['Security Portal', 'Tenant', 'BuildingPass, Visitors, Incidents', 'Leitura + registo ocorrencias'],
  ['Technician Portal', 'Tenant/Assigned', 'Assets, Work Orders', 'Leitura + update de ordens atribuidas'],
  ['Vendor Portal', 'Tenant/Assigned', 'Work Orders, Contracts', 'Leitura + resposta a pedidos/cotacoes'],
  ['User Portal', 'Self + linked unit', 'Unit, invoices, notices, access', 'Leitura + pedidos + visitantes'],
];

const Building360BlueprintV1Page: React.FC = () => {
  const navigate = useNavigate();

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
        </header>

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
                <th className="py-2">Objectivo</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(([method, path, purpose]) => (
                <tr key={path} className="border-b border-slate-800/60 text-slate-200">
                  <td className="py-2 pr-4 font-semibold text-sky-300">{method}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{path}</td>
                  <td className="py-2">{purpose}</td>
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
      </div>
    </div>
  );
};

export default Building360BlueprintV1Page;
