```
╔════════════════════════════════════════════════════════════════════════════╗
║           PLATAFORMA DE EDUCAÇÃO ONLINE - ROADMAP COMPLETO                ║
║                    EduGuard 360 - Moçambique 2026                          ║
╚════════════════════════════════════════════════════════════════════════════╝

📅 CRONOGRAMA: 8-12 SEMANAS

┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 1-2: FUNDAÇÃO (Setup Database + Auth)                            │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ BANCO DE DADOS
     └─ Supabase setup
     └─ Schema PostgreSQL (database_schema_education.sql)
     └─ Índices de performance
     └─ Views para analytics

  ✅ AUTENTICAÇÃO & ROLES
     └─ Auth context (React)
     └─ User roles system (student, educator, admin)
     └─ Email verification
     └─ 2FA setup

  📁 FILES: 
     - database_schema_education.sql


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 3-4: CIRCUITO DE CURSOS                                          │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ DESCOBERTA & EXPLORAÇÃO
     └─ Home com cursos recomendados
     └─ Catálogo com filtros (categoria, preço, nível)
     └─ Busca com autocomplete
     └─ Ordenação por rating, novidade, populari...

  ✅ DETALHES DO CURSO
     └─ Preview (2 primeiras aulas grátis)
     └─ Ratings & reviews
     └─ Educador profile
     └─ Currículo completo

  ✅ UPLOAD & ARMAZENAMENTO
     └─ Upload de vídeos para S3
     └─ Transcodificação para HLS
     └─ Upload de PDFs
     └─ Processamento paralelo

  ✅ PLAYER DE VÍDEO
     └─ HLS player (video.js)
     └─ Progresso salvo automático
     └─ Speed control (0.5x - 2x)
     └─ Download offline

  📁 FILES:
     - CourseCircuit.tsx (UI)
     - LessonViewer component

  📊 BANCO:
     - courses table
     - course_lessons table
     - course_assessments table


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 5: SISTEMA DE PAGAMENTOS                                         │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ M-PESA INTEGRATION
     └─ Vodacom API sandbox
     └─ Request/callback handling
     └─ Webhook para confirmações
     └─ Reconciliação de transações

  ✅ STRIPE (Cartão de Crédito)
     └─ Checkout session
     └─ 3D Secure verification
     └─ Webhook events
     └─ Refund management

  ✅ TRANSFERÊNCIA BANCÁRIA
     └─ Geração de referência
     └─ QR code para transferência
     └─ Manual confirmation
     └─ Reconciliação diária

  ✅ VOUCHERS & PROMOÇÕES
     └─ Código de voucher
     └─ Desconto percentual/fixo
     └─ Data expiração
     └─ Limite de uso

  ✅ CHECKOUT FLOW
     └─ Seleção de método
     └─ Confirmação
     └─ Webhooks
     └─ Email confirmation

  📁 FILES:
     - payments.routes.js (backend)
     - PaymentCheckout component (UI)

  📊 BANCO:
     - payment_transactions table
     - educator_payouts table


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 6: ONBOARDING DE EDUCADORES                                      │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ APLICAÇÃO & VERIFICAÇÃO
     └─ Formulário de candidatura
     └─ Upload de credenciais (diploma)
     └─ Verificação manual
     └─ Aprovação automática (IA)
     └─ Email notification

  ✅ CRIAÇÃO DE CURSO
     └─ Wizard 4 passos
     └─ Upload de cover image
     └─ Descrição & learning objectives
     └─ Preço setup
     └─ Categoria & level

  ✅ DASHBOARD DE EDUCADOR
     └─ Stats (alunos, ganhos, rating)
     └─ Gestão de cursos
     └─ Analytics
     └─ Pedido de saque

  📁 FILES:
     - EducatorDashboard.tsx
     - CreateCourseForm component

  📊 BANCO:
     - user_roles table (educator role)


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 7: PORTAL DE LITERATURA ABERTA                                    │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ FONTES DE DADOS
     └─ Project Gutenberg API
     └─ Open Library API
     └─ arXiv (papers científicos)
     └─ SSRN
     └─ Repoarte.ac.mz (Moçambique)

  ✅ INTERFACE DE BUSCA
     └─ Busca multi-campo
     └─ Filtros (idioma, licença, país, tipo)
     └─ Coleções temáticas
     └─ Autores moçambicanos

  ✅ LEITOR PDF
     └─ PDF viewer web
     └─ Navegação de páginas
     └─ Anotações & highlights
     └─ Download (PDF, ePUB, mobi)

  ✅ INTEGRAÇÃO COM CURSOS
     └─ Educador linka literatura
     └─ Referências na aula
     └─ Quiz baseado em leitura
     └─ Discussão em fórum

  📁 FILES:
     - LiteraturePortal.tsx
     - LiteratureReader component

  📊 BANCO:
     - open_literature table
     - literature_annotations table
     - literature_course_links table


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 8: CERTIFICAÇÕES & GAMIFICAÇÃO                                   │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ QUIZZES & ASSESSMENTS
     └─ Questões de múltipla escolha
     └─ Respostas abertas
     └─ Projetos práticos
     └─ Scoring automático

  ✅ CERTIFICADOS
     └─ Geração PDF
     └─ Assinatura digital
     └─ QR code de verificação
     └─ Blockchain validation (opcional)

  ✅ BADGES & GAMIFICAÇÃO
     └─ Badge ao completar curso
     └─ Streak (dias consecutivos)
     └─ Leaderboard
     └─ Recomendações personalizadas

  ✅ PROGRESSO & NOTIFICAÇÕES
     └─ Barra de progresso visual
     └─ Emails de reminder
     └─ Notificações push
     └─ Feedback personalizado

  📁 FILES:
     - CertificateService (backend)
     - ProgressTracker component


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 9-10: COMUNIDADE & FÓRUM                                         │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ FÓRUM DE DISCUSSÃO
     └─ Threads por lição
     └─ Respostas com votação
     └─ Respostas marcadas de educador
     └─ Moderação

  ✅ MENSAGENS PRIVADAS
     └─ Chat educador-aluno
     └─ Notificações em tempo real
     └─ Histórico persistente

  ✅ COMUNIDADE
     └─ Perfis de alunos
     └─ Seguir educadores
     └─ Compartilhamento de certificados
     └─ Recomendações sociais

  📁 FILES:
     - ForumComponent
     - ChatService (real-time)

  📊 BANCO:
     - course_forum_threads
     - course_forum_replies
     - messages table


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 11: ANALYTICS & PERFORMANCE                                       │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ DASHBOARD PARA EDUCADORES
     └─ Ganhos mensais
     └─ Taxa conclusão por curso
     └─ Engajamento dos alunos
     └─ Feedback & ratings

  ✅ DASHBOARD PARA ADMINISTRADORES
     └─ Total de usuários
     └─ Transações por dia
     └─ Verificação de educadores
     └─ Relatórios

  ✅ OTIMIZAÇÃO
     └─ Cache Redis
     └─ CDN para vídeos
     └─ Minificação JS/CSS
     └─ Compressão de imagens

  📁 FILES:
     - AnalyticsDashboard component
     - performance.metrics.ts


┌─────────────────────────────────────────────────────────────────────────┐
│ SEMANA 12: TESTES, SEGURANÇA & DEPLOY                                   │
└─────────────────────────────────────────────────────────────────────────┘

  ✅ TESTES
     └─ Unit tests (90%+ coverage)
     └─ Integration tests
     └─ E2E tests (Cypress)
     └─ Performance tests

  ✅ SEGURANÇA
     └─ SSL/TLS
     └─ JWT tokens
     └─ Rate limiting
     └─ CSRF protection
     └─ XSS prevention
     └─ SQL injection prevention

  ✅ DEPLOY
     └─ CI/CD pipeline (GitHub Actions)
     └─ Docker containerization
     └─ Database migrations
     └─ Backup strategy
     └─ Error tracking (Sentry)
     └─ Monitoring (Datadog/New Relic)

  ✅ DOCUMENTAÇÃO
     └─ API docs (Swagger)
     └─ User guides
     └─ Video tutorials
     └─ FAQ

  ✅ LAUNCH
     └─ Beta testing com grupo piloto
     └─ Feedback & ajustes
     └─ Launch day
     └─ Press release


╔════════════════════════════════════════════════════════════════════════════╗
║                          ARQUIVOS CRIADOS                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

📄 DOCUMENTAÇÃO:
  ✓ ARCHITECTURE_COURSE_PLATFORM.md        (Arquitetura completa)
  ✓ IMPLEMENTATION_GUIDE_COMPLETE.md       (Guia fase-por-fase)
  ✓ database_schema_education.sql          (Schema PostgreSQL)
  ✓ payments.routes.js                     (API de pagamentos)
  ✓ CourseCircuit.tsx                      (UI cursos)
  ✓ LiteraturePortal.tsx                   (Portal literatura)
  ✓ EducatorDashboard.tsx                  (Dashboard educador)


╔════════════════════════════════════════════════════════════════════════════╗
║                        CHECKLIST PRÉ-LAUNCH                                ║
╚════════════════════════════════════════════════════════════════════════════╝

FUNCIONALIDADES CORE:
  ☐ Autenticação de usuários
  ☐ Criação de cursos por educadores
  ☐ Inscrição em cursos (M-Pesa + Cartão)
  ☐ Visualização de aulas com progresso
  ☐ Certificados ao completar
  ☐ Fórum de discussão
  ☐ Pedido de saque para educadores

PAGAMENTOS:
  ☐ M-Pesa testado em sandbox
  ☐ Stripe testado com cartões de teste
  ☐ Transferência bancária setup
  ☐ Reconciliação automática

LITERATURA:
  ☐ Integração com Gutenberg
  ☐ Busca funcionando
  ☐ Download de PDFs

QUALIDADE:
  ☐ 90%+ test coverage
  ☐ < 3s home page load
  ☐ Mobile responsivo
  ☐ Acessibilidade (WCAG AA)
  ☐ SSL/TLS ativo

OPERAÇÕES:
  ☐ Backups automáticos diários
  ☐ Monitoramento 24/7
  ☐ Error tracking
  ☐ Support email setup
  ☐ FAQ & help center


╔════════════════════════════════════════════════════════════════════════════╗
║                      PRÓXIMOS PASSOS (IMEDIATO)                            ║
╚════════════════════════════════════════════════════════════════════════════╝

1️⃣  EXECUTAR DATABASE SETUP
    → Criar projeto Supabase
    → Executar database_schema_education.sql
    → Testar conexão

2️⃣  INSTALAR DEPENDÊNCIAS
    → Frontend: npm install stripe axios zustand
    → Backend: npm install express stripe redis axios

3️⃣  SETUP DE PAGAMENTOS
    → M-Pesa: Registrar conta de negócio
    → Stripe: Criar conta test
    → Obter credentials

4️⃣  IMPLEMENTAR COMPONENTES
    → Integrar CourseCircuit.tsx
    → Integrar LiteraturePortal.tsx
    → Integrar EducatorDashboard.tsx

5️⃣  TESTAR FLUXOS
    → Inscrição em curso (teste M-Pesa)
    → Upload de vídeo
    → Geração de certificado

6️⃣  LAUNCH BETA
    → Recrutar 50-100 early adopters
    → Feedback & iteração
    → Suportar via email/chat


═══════════════════════════════════════════════════════════════════════════════

ESTIMATIVAS DE CUSTO (Primeiros 6 meses):

  Infraestrutura:
    - Supabase (Pro)         MZN 15.000
    - AWS (videos/CDN)       MZN 25.000
    - Stripe/M-Pesa fees     MZN 100.000+ (% de transações)

  Pessoal:
    - 2 Devs Frontend        MZN 60.000 × 2 = MZN 120.000
    - 2 Devs Backend         MZN 70.000 × 2 = MZN 140.000
    - 1 DevOps/Infra         MZN 80.000
    - 1 Designer UI/UX       MZN 50.000
    - 1 Product Manager      MZN 70.000

  TOTAL: ~MZN 600.000 (primeiros 6 meses)

  ROI esperado: MZN 500.000+ (2-3 meses)

═══════════════════════════════════════════════════════════════════════════════
```
