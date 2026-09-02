# Relatorio Final de Evidencias - EduGuard360

Data/hora (UTC): 2026-09-02T21:56:10Z
Ambiente local: http://127.0.0.1:4173
Projeto Supabase: gyrpigvvmndfjwswknud

## 1) Correcao aplicada para fechar matriz de login por perfil

Arquivo alterado:
- src/context/SystemAuthContext.tsx

Mudanca:
- parseLegacyUser passou a normalizar role/perfil legado com normalizeEnterpriseRole(legacy.role || legacy.perfil), eliminando fallback parcial que classificava professor/financeiro como unknown e devolvia ao login.

## 2) Matriz E2E de login por perfil (execucao real)

Credenciais usadas:
- Password comum de teste: EduGuard@2026A
- Contas: qa.superadmin, qa.director, qa.administrator, qa.professor, qa.financeiro, qa.seguranca, qa.parent, qa.student (@eduguard360.co.mz)

Resultado por rota apos clique em Sign In:

| Perfil | URL final observada | Esperada | Resultado |
|---|---|---|---|
| super_admin | /sistema/admin | /sistema/admin | PASS |
| director | /sistema/direcao | /sistema/direcao | PASS |
| administrator | /sistema/administracao | /sistema/administracao | PASS |
| professor | /sistema/professor | /sistema/professor | PASS |
| financeiro | /sistema/financeiro | /sistema/financeiro | PASS |
| seguranca | /sistema/seguranca | /sistema/seguranca | PASS |
| parent | /sistema/encarregado | /sistema/encarregado | PASS |
| student | /cursos | /cursos | PASS |

Validacao de banco por perfil (utilizadores):
- Todos com login OK, linha encontrada em public.utilizadores, status=active, is_active=true.
- auth_id vinculado e correspondente ao utilizador autenticado em todos os 8 perfis.

## 3) Evidencia transacional - modulo QR (clique + efeito em banco)

### 3.1 Evidencia de clique no portal de seguranca

Execucao real no browser:
- Clique em Sign In com qa.seguranca+20260902@eduguard360.co.mz
- URL apos login: /sistema/seguranca
- Estado visivel: "Scanner ativo. Aguardando cartao..."
- Perfil visivel: "Seguranca Operacional / QR Code"

### 3.2 Semeadura controlada de aluno QR para teste

No SQL Editor, foi assegurado um aluno com qrcode_id = QA-QR-SEED-SEG-20260902 na escola de QA.
Aluno usado na prova:
- id: 843467cb-190b-41dd-a339-7d055d09deb6
- nome: Aluno QA Scanner Seed
- escola_id: 11111111-1111-4111-8111-111111111111

### 3.3 Prova de escrita real em public.entradas

Resultado validado com sessao autenticada:
- Conta: qa.superadmin+20260902@eduguard360.co.mz (tambem permitida no modulo scanner)
- before.count para aluno_id 843467cb-190b-41dd-a339-7d055d09deb6: 0
- insert efetuado em public.entradas:
  - id: 7725db46-6c9a-47d8-9c5b-8d7c2f871ae0
  - tipo: entrada
  - data: 2026-09-02T21:47:39.476945
- after.count: 1
- delta_count: +1

Conclusao:
- Escrita real em entradas confirmada com evidencias before/after e id do registo inserido.

### 3.4 Prova final apos ajuste RLS (perfil seguranca)

Ajustes aplicados no SQL Editor:
- policy em public.alunos: Scanner pode ler alunos por escola
- policy em public.entradas: Scanner pode inserir entradas da sua escola
- policy em public.entradas: Scanner pode ler entradas da sua escola
- funcao public.can_scanner_write_entry(uuid) para validacao segura por escola/perfil

Reexecucao autenticada com qa.seguranca+20260902@eduguard360.co.mz:
- before.count para aluno_id 843467cb-190b-41dd-a339-7d055d09deb6: 2
- insert efetuado em public.entradas com retorno no proprio perfil seguranca:
  - id: 763156f2-7858-4cd3-b754-19f565a63800
  - tipo: entrada
  - data: 2026-09-02T21:55:20.507043
- after.count: 3
- delta_count: +1

Conclusao final do modulo QR:
- O perfil seguranca passou a conseguir persistir movimento real em public.entradas no escopo da escola, com id de registo retornado na operacao.

## 4) Achado critico de governanca (RLS) para perfil seguranca

Probe com conta qa.seguranca+20260902@eduguard360.co.mz no mesmo aluno:
- leitura em public.alunos retornou sem erro, mas sem visibilidade da linha (RLS filtering)
- tentativa de insert em public.entradas falhou com code 42501:
  - "new row violates row-level security policy for table \"entradas\""

Estado apos correcao:
- Resolvido. O bloqueio 42501 foi eliminado para o fluxo de seguranca no escopo escolar.

## 5) Recomendacao de fechamento para 100% operacional no perfil seguranca

- Concluido neste ciclo: ajuste RLS aplicado e validado com insert real no perfil seguranca.
- Recomendado para continuidade: manter estas politicas no script oficial de hardening para evitar regressao em novos ambientes.

## 6) Trilha de auditoria resumida

- Login por 8 perfis com verificacao de URL final.
- Verificacao de banco por perfil em public.utilizadores (status/is_active/auth_id).
- Login por clique no modulo /sistema/seguranca.
- Semeadura do aluno QR no SQL Editor.
- Insert real em public.entradas com before/after e id do registo.
- Probe RLS com conta seguranca documentando bloqueio 42501.
- Ajuste de politicas RLS + funcao de validacao, seguido de reexecucao com sucesso e id retornado no perfil seguranca.

## 7) Building360 - Shells dedicados + fluxo interligado (2026-09-03)

### 7.1 Segregacao visual por perfil (Portal do Residente vs Admin Console)

Escopo implementado:
- Shell residente com widgets e foco em autosservico: pagamentos, solicitacoes, acessos, reservas, comunicacao.
- Shell administrativo com visao operacional integrada e indicadores para gestao de modulos.

Prova E2E (browser local):

| Perfil | Rota | Portal do Residente | Admin Console Building360 | Resultado |
|---|---|---|---|---|
| resident | /building360/workspace/resident/request | true | false | PASS |
| organization_admin | /building360/workspace/organization_admin/property | false | true | PASS |

### 7.2 Matriz de fluxo interligado (Request360 -> Maintain360 -> Notification -> History)

#### Evidencia frontend (execucao sequencial real no UI)

Fluxo executado via botoes do Flow Lab no workspace:
1. Criar Request
2. Encaminhar Maintain360
3. Notificar Community360
4. Fechar Historico

| Etapa | Perfil executor | Rota direta | Estado observado | Request | Maintain | Notify | History | Resultado |
|---|---|---|---|---|---|---|---|---|
| Request360 | resident | /building360/workspace/resident/request | request_opened | ok | - | - | - | PASS |
| Maintain360 | maintenance_manager | /building360/workspace/maintenance_manager/maintenance | maintenance_assigned | ok | ok | - | - | PASS |
| Notification | community_manager | /building360/workspace/community_manager/community | notification_sent | ok | ok | ok | - | PASS |
| History | organization_admin | /building360/workspace/organization_admin/insight | history_closed | ok | ok | ok | ok | PASS |

Evidencia consolidada final do fluxo:
- flowId: REQ-1788390015506
- status final: history_closed
- atores: requestBy=resident, maintenanceBy=maintenance_manager, notificationBy=community_manager, historyBy=organization_admin

#### Evidencia backend (autorizacao RBAC por etapa)

Script executado: scripts/e2e_backend_building360_flow_matrix.mjs

| Etapa | Rota | Perfil permitido | allowed obtido | Perfil negado | denied obtido | Fonte | Resultado |
|---|---|---|---|---|---|---|---|
| Request360 | /building360/workspace/resident/request | resident | true | security_officer | false | core-building360-workspace-authorize | PASS |
| Maintain360 | /building360/workspace/maintenance_manager/maintenance | maintenance_manager | true | resident | false | core-building360-workspace-authorize | PASS |
| Notification (Community360) | /building360/workspace/community_manager/community | community_manager | true | technician | false | core-building360-workspace-authorize | PASS |
| History (Insight360) | /building360/workspace/organization_admin/insight | organization_admin | true | resident | false | core-building360-workspace-authorize | PASS |

Conclusao Building360:
- Separacao de experiencias por perfil validada (residente vs administrador).
- Fluxo interligado ponta-a-ponta validado com evidencias frontend e backend.
- Modelo reforca a arquitetura definida: identidade unica + RBAC por modulo + isolamento por tenant.
