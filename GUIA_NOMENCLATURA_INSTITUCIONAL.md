# Guia Rápido de Nomenclatura Institucional (UX)

## Objetivo
Manter consistência textual entre portais, telas, botões, filtros, mensagens e PRs, usando uma linguagem institucional única.

## Princípio Base
Sempre priorizar o nome institucional do domínio de gestão (função organizacional), em vez de variações pessoais ou abreviações soltas.

## Vocabulário Oficial (usar)
- Administração Geral
- Direção
- Administração Escolar
- Secretaria Académica
- Coordenação Académica
- Professor
- Gestão Financeira
- Recursos Humanos
- Segurança Operacional
- Encarregado
- Aluno
- Gestão Institucional

## Vocabulário a Evitar (substituir)
- Super Administrador -> Administração Geral
- Diretor / Diretores -> Direção
- Administrador (genérico de escola) -> Administração Escolar
- Secretaria / Secretarias -> Secretaria Académica
- Coordenador / Coordenadores -> Coordenação Académica
- Financeiro -> Gestão Financeira
- RH -> Recursos Humanos
- Segurança (isolado, quando contexto for papel/área) -> Segurança Operacional
- Admin (em texto de UI) -> Gestão Institucional ou Administração Escolar (conforme contexto)

## Regras de Aplicação
1. Labels de perfil
- Filtros, tags, chips, cards e dropdowns devem usar o vocabulário oficial.

2. Botões e CTAs
- Preferir linguagem de área institucional.
- Exemplo: "Abrir Gestão Institucional" em vez de "Abrir Admin".

3. Mensagens ao utilizador
- Trocar "o administrador" por "a Administração Escolar" quando a ação for da equipa de escola.
- Trocar "admin global" por "Administração Geral" quando a ação for central/plataforma.

4. Comentários de código
- Podem seguir linguagem técnica, mas quando citarem perfis funcionais, usar os nomes oficiais.

5. Compatibilidade técnica
- Não alterar chaves técnicas de RBAC/rotas apenas por estética textual.
- Exemplo: manter `super_admin`, `director`, `secretaria` no código; mudar apenas texto visível.

## Mapa Rápido: Técnico -> Exibição
- super_admin -> Administração Geral
- director -> Direção
- administrator -> Administração Escolar
- secretaria -> Secretaria Académica
- coordenador -> Coordenação Académica
- professor -> Professor
- financeiro -> Gestão Financeira
- rh -> Recursos Humanos
- seguranca -> Segurança Operacional
- parent -> Encarregado
- student -> Aluno

## Checklist para PR
- [ ] Revisei botões, filtros e cabeçalhos com o vocabulário oficial.
- [ ] Revisei mensagens de sucesso/erro/ajuda com a nomenclatura institucional.
- [ ] Mantive compatibilidade com aliases legados em query params quando necessário.
- [ ] Não alterei nomes técnicos de permissões/roles sem necessidade funcional.
- [ ] Validei consistência entre Login, Enterprise, Admin e portais adjacentes impactados.

## Escopo Recomendado por Alteração
Quando alterar uma feature com texto de perfis, verificar no mínimo:
- Login do sistema
- Portal Enterprise
- Dashboard Admin
- Portal Analytics
- Portal Encarregado
- Telas de Escola relacionadas
