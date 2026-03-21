# EduGuard360 - Sistema Operativo de Segurança Escolar Inteligente

Uma plataforma digital revolucionária para segurança escolar em Moçambique, focada em controle de acesso, monitorização de alunos, gestão de riscos e prevenção inteligente.

## 🎯 Visão Geral

EduGuard360 é um sistema inteligente que controla, monitora e previne riscos dentro do ambiente escolar, garantindo segurança total através de tecnologia digital. Não é apenas um controle de presença - é uma infraestrutura completa de gestão de risco escolar.

## 🏫 Objetivo Principal

Garantir:
- ✅ Segurança física dos alunos
- ✅ Rastreabilidade completa de movimentos
- ✅ Resposta rápida a incidentes
- ✅ Transparência para pais e gestores
- ✅ Redução de fraude e negligência

## 🧱 Arquitetura do Sistema

### 🔹 Frontend
- React 18 com TypeScript
- Vite para build otimizado
- Interface moderna (Tailwind CSS + Shadcn/UI)
- SPA (Single Page Application)

### 🔹 Backend
- Supabase (Auth + Database + Storage)
- Autenticação segura
- Base de dados PostgreSQL

### 🔹 Funcionalidades Avançadas
- QR Scanner integrado
- Geração automática de relatórios (PDF)
- Sistema de notificações
- Análise inteligente de dados

## 👥 Tipos de Utilizadores

1. **👨‍💼 Administrador (Direção)**
   - Gestão total do sistema
   - Visualização de todos os dados
   - Definição de regras e políticas

2. **🛡️ Segurança / Portaria**
   - Registro de entradas e saídas
   - Utilização do QR Scanner
   - Controle de acessos físicos

3. **👩‍🏫 Escola / Funcionários**
   - Monitorização de alunos
   - Registro de incidentes
   - Acompanhamento de histórico

4. **👨‍👩‍👧 Encarregados (futuro)**
   - Acompanhamento dos filhos
   - Recebimento de alertas
   - Acesso a relatórios

## 🔑 Funcionalidades Principais

### 🟢 1. Controle de Acesso (Core do Sistema)
- **🔐 Entrada / Saída**: Sistema de QR codes únicos por aluno
- **📊 Registro Automático**: Hora, tipo de movimento, localização
- **👀 Visibilidade Total**: Quem está na escola em tempo real

### 📷 2. QR Scanner Avançado
- Leitura via câmera do dispositivo
- Integração direta com base de dados
- Identificação instantânea

### 👨‍🎓 3. Gestão Completa de Alunos
- Perfil detalhado (Nome, ID, Turma, QR Code)
- Histórico de presença
- Registro de incidentes

### 🏫 4. Dashboard Executivo
- **📊 Indicadores em Tempo Real**:
  - Alunos presentes
  - Entradas/saídas do dia
  - Alertas ativos
  - Incidentes recentes

### 🚨 5. Gestão de Incidentes
- Registro de ocorrências (atrasos, comportamento, segurança)
- Classificação de risco
- Histórico por aluno

### 📑 6. Relatórios Automatizados
- Geração com jsPDF e AutoTable
- **Tipos de Relatórios**:
  - Presença diária
  - Relatório por aluno
  - Incidentes
  - Estatísticas mensais

### 🧠 7. Análise Inteligente
- Previsão de faltas (predictAbsence.ts)
- Relatórios diários automatizados
- Base para IA futura

### 🔐 8. Autenticação Segura
- Login via Supabase
- Perfis por função
- Controle granular de acesso

## 📱 Experiência do Utilizador

### 🔹 Na Portaria
1. Abrir o sistema
2. Selecionar: Entrada ou Saída
3. Escanear QR do aluno
4. Sistema registra automaticamente

### 🔹 Administrador
1. Acessar dashboard executivo
2. Visualizar estatísticas globais
3. Analisar relatórios
4. Gerenciar utilizadores

### 🔹 Professores/Escola
1. Consultar alunos da turma
2. Registrar incidentes
3. Acompanhar histórico

## 🌐 Acesso à Plataforma

A aplicação está disponível em: **https://eduguard360.co.mz**

### Credenciais de Teste (Administrador)
- **Email**: admin@eduguard360.co.mz
- **Senha**: Admin@1234

⚠️ **Importante**: Altere estas credenciais antes do deploy em produção.

## 💰 Modelo de Negócio

### 💼 SaaS (Software as a Service)
- Escolas pagam mensalmente
- **Planos Disponíveis**:
  - Básico: Controle de acesso + relatórios básicos
  - Profissional: + gestão de incidentes + análise
  - Enterprise: + customizações + suporte premium

### 💸 Serviços Adicionais
- Setup inicial
- Personalização
- Formação da equipe
- Suporte técnico

## 🚀 Escalabilidade

### Funcionalidades Futuras
- App mobile para pais
- Notificações em tempo real (push/SMS)
- Integração com biometria
- IA preditiva avançada
- Integração com Ministério da Educação

## 🛠️ Desenvolvimento

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação
```bash
npm install
```

### Desenvolvimento Local
```bash
npm run dev
```

### Build para Produção
```bash
npm run build
```

### Testes
```bash
npm run test
npm run test:coverage
```

## 🌍 Contexto Moçambicano

O EduGuard360 foi desenvolvido especificamente para o contexto educacional de Moçambique, considerando:
- Infraestrutura escolar local
- Necessidades de segurança específicas
- Integração com sistemas governamentais
- Adaptação cultural e linguística

## 🔥 Diferencial Competitivo

- **QR + Rastreamento em Tempo Real**: Tecnologia única no mercado
- **Histórico Auditável**: Conformidade e transparência
- **Foco em Prevenção**: Não apenas reação a incidentes
- **Análise de Dados Integrada**: Insights inteligentes
- **Adaptado ao Contexto Africano**: Solução localizada

## 📞 Contacto

Para demonstrações, implementação ou informações adicionais:
- Website: https://eduguard360.co.mz
- Email: contacto@eduguard360.co.mz

---

**EduGuard360** - Transformando a segurança escolar através da tecnologia digital. 🇲🇿
