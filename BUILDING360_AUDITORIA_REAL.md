# BUILDING360 Auditoria Real do Codigo

Data: 2026-08-11
Escopo: codigo que sustenta a rota /building360, backend NestJS e integracoes reais.

## 1) Diagnostico executivo

Estado atual: a visao de produto esta bem representada no frontend, mas a operacao real ainda esta em fase inicial.

Resumo:
- Camada visual e narrativa de produto: forte.
- API Building360: existe, mas ainda parcial.
- Persistencia de dados Building360: ainda nao existe em banco (dados mock em memoria).
- RBAC enterprise: existe e foi expandido com perfis operacionais Building360.
- Auth/JWT e escopo tenant: existe e tem testes focados.

## 2) Evidencias de implementacao atual

### 2.1 Frontend Building360
- Portal principal com consumo real de endpoints:
  - /api/v1/building360/overview
  - /api/v1/building360/sites
  - /api/v1/building360/buildings
  - /api/v1/building360/units
- Arquivo: src/pages/building/Building360PortalPage.tsx

### 2.2 Backend Building360
- Endpoints implementados:
  - GET /building360/overview
  - GET /building360/sites
  - GET /building360/buildings
  - GET /building360/units
  - GET /building360/assets
  - GET /building360/work-orders
  - POST /building360/work-orders
  - PATCH /building360/work-orders/:id
  - POST /building360/billing/run
- Arquivo: backend/src/modules/building360/building360.controller.ts

### 2.3 Limite atual do backend
- Building360Service usa arrays em memoria (nao usa TypeORM/repositorios para Building360).
- Arquivo: backend/src/modules/building360/building360.service.ts

### 2.4 Auth, tenant scope e RBAC
- Guard com escopo tenant/school obrigatorio para perfis nao super_admin.
- Arquivo: backend/src/modules/enterprise/guards/enterprise-rbac.guard.ts
- Testes HTTP dos guards: backend/src/modules/enterprise/enterprise-http.e2e-spec.ts
- Testes de isolamento de tenant: backend/src/modules/enterprise/tenant-isolation.e2e-spec.ts

### 2.5 RBAC Building360 (entrega feita nesta iteracao)
- Perfis adicionados:
  - platform_admin
  - organization_admin
  - building_manager
  - finance_manager
  - security_manager
  - maintenance_manager
  - security_officer
  - technician
  - vendor
  - occupant
  - resident
  - auditor
- Aliases adicionados (ex.: porteiro -> security_officer).
- Testes novos passam:
  - backend/src/modules/enterprise/rbac.matrix.spec.ts

## 3) Gaps reais por prioridade

## PRIORIDADE 1 - Login e gestao de utilizadores por perfil Building360
Status: parcial
- Existe base de JWT + role + tenant scope.
- Falta onboarding de usuarios por contexto Building360 (organizacao/site/edificio/unidade) com vinculacao de ownership real.

## PRIORIDADE 2 - RBAC verdadeiro por dominio Building360
Status: parcial
- Matriz de permissoes existe e foi expandida para papeis Building360.
- Falta separar dominios de permissao especificos de Building360 (ex.: visitors, access_logs, contracts, vendors, procurement, assets_lifecycle).

## PRIORIDADE 3 - Estrutura operacional (organizacao > portfolio > site > edificio > piso > unidade)
Status: insuficiente
- Existem listagens mock de site/building/unit.
- Falta CRUD persistente e relacionamento completo no banco.

## PRIORIDADE 4 - Finance360 real
Status: insuficiente
- Existe apenas simulacao de billing run.
- Faltam entidades e fluxo completo: charges, invoices, payments, receipts, ledger por tenant.

## PRIORIDADE 5 - BuildingPass real
Status: ausente no modulo Building360
- Blueprint cita visitors/access logs, mas endpoints nao estao implementados no controller atual.

## PRIORIDADE 6 - Asset360 + Maintain360 ponta a ponta
Status: parcial
- Assets e work orders existem em memoria.
- Falta ciclo completo com orcamento, aprovacao, evidencia, custo e encerramento persistente.

## PRIORIDADE 7 - Vendor360 + Contract360 + Procurement
Status: ausente
- Nao ha modulo dedicado no backend Nest para estas trilhas do Building360.

## PRIORIDADE 8 - Occupant Portal e Guard Portal
Status: ausente
- Nao ha rotas/views operacionais dedicadas para guard/occupant no app principal Building360.

## PRIORIDADE 9 - Insights reais por dados operacionais
Status: parcial
- Cards e indicadores existem no frontend.
- Falta alimentar analytics com fatos transacionais persistidos do Building360.

## PRIORIDADE 10 - IA
Status: posterior
- Correto manter apos dados operacionais estaveis e historico confiavel.

## 4) Sequencia de execucao recomendada (seguir estritamente)

### Etapa 1 - Auditoria tecnica
- Concluida nesta entrega.

### Etapa 2 - Core transacional
- Entidades e CRUD: Organization, Portfolio, Site, Building, Floor, Unit, Person, Membership, RoleAssignment.
- Regras: tenant_id obrigatorio em todas as tabelas de dominio.

### Etapa 3 - Finance360
- Modelo: Contract, ChargeRule, Charge, Invoice, Payment, Receipt, Expense, LedgerEntry.
- Estado financeiro por unidade/tenant.

### Etapa 4 - BuildingPass
- Modelo: Credential, AccessRule, AccessEvent, Visitor, Vehicle, Incident.
- Painel Guard dedicado.

### Etapa 5 - Asset360 + Maintain360
- Modelo: Asset, MaintenancePlan, Ticket, WorkOrder, Quote, Approval, ExecutionEvidence.

### Etapa 6 - Portais de operacao
- Occupant portal
- Guard portal
- Manager workspace

### Etapa 7 - Contracts + Vendors + Procurement
- Modelo: Vendor, SLA, Contract, RFQ, Bid, Award, PurchaseOrder.

### Etapa 8 - Pagamentos
- Integrar PSP sem custodia direta de fundos.

### Etapa 9 - Insight360
- Dashboards por dados reais (SQL aggregations por tenant).

### Etapa 10 - Building Intelligence
- IA apenas apos dados confiaveis e governanca.

## 5) Aceitacao tecnica minima para considerar "operacional"

- Todos os endpoints Building360 deixam de usar arrays em memoria.
- Todas as entidades Building360 possuem tenant scope obrigatorio.
- RBAC por papel + escopo validado por testes.
- Trilhas de auditoria para create/update/delete/eventos criticos.
- Pelo menos 1 fluxo ponta a ponta funcional:
  - abertura de ticket -> atribuicao -> execucao -> evidencia -> encerramento
- Pelo menos 1 fluxo financeiro funcional:
  - contrato -> cobranca -> fatura -> pagamento -> recibo

## 6) Entregas feitas agora

- RBAC expandido para perfis Building360 em backend/src/modules/enterprise/rbac.matrix.ts.
- Testes de RBAC para perfis Building360 em backend/src/modules/enterprise/rbac.matrix.spec.ts.
- Testes executados com sucesso (4/4).
