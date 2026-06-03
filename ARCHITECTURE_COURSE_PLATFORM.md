# Arquitetura Completa - Plataforma de Cursos EduGuard 360

## 📋 Índice
1. [Circuito de Cursos](#circuito)
2. [Onboarding de Educadores](#educadores)
3. [Sistema de Pagamentos](#pagamentos)
4. [Portal de Literatura](#literatura)
5. [Fluxos de Usuário](#fluxos)

---

## 🔄 Circuito de Cursos {#circuito}

### Arquitetura Baseada em Melhores Práticas Internacionais

#### Inspiração: Coursera, Udemy, edX, LinkedIn Learning

```
┌─────────────────────────────────────────────────────┐
│         PLATAFORMA DE EDUCAÇÃO ONLINE                │
└─────────────────────────────────────────────────────┘

1️⃣ DESCOBERTA & EXPLORAÇÃO
   ├─ Homepage com recomendações personalizadas
   ├─ Catálogo com filtros (categoria, nível, preço)
   ├─ Busca inteligente com autocomplete
   └─ Coleções temáticas por área profissional

2️⃣ AVALIAÇÃO DO CURSO
   ├─ Prévia: primeiras 2-3 aulas grátis
   ├─ Descrição detalhada
   ├─ Avaliações de alunos (ratings 1-5 estrelas)
   ├─ Credenciais do educador
   └─ Certificado ao final (portfólio digital)

3️⃣ INSCRIÇÃO & PAGAMENTO
   ├─ Checkout seguro (Stripe/M-Pesa/Transferência)
   ├─ Confirmação por email
   ├─ Acesso imediato ao curso
   └─ 30 dias de garantia satisfação

4️⃣ APRENDIZAGEM
   ├─ Aulas estruturadas (vídeo + materiais PDF)
   ├─ Exercícios práticos & quizzes
   ├─ Fórum/Chat com educador e colegas
   ├─ Progresso em tempo real (%)
   └─ Download de materiais

5️⃣ CERTIFICAÇÃO
   ├─ Conclusão com 70%+ de progresso
   ├─ Certificado digital (PDF + blockchain)
   ├─ Badge no perfil
   └─ Partilha em LinkedIn/CV digital

6️⃣ PÓS-CURSO
   ├─ Acesso permanente às aulas
   ├─ Atualizações do curso gratuitas
   ├─ Comunidade de alumni
   └─ Caminho de especialização (cursos avançados)
```

---

## 👨‍🏫 Onboarding de Educadores {#educadores}

### Modelo: Democratizar a Educação

```
PERFIS DE EDUCADORES

1. EDUCADOR INICIANTE
   └─ Criar 1 curso piloto
   └─ Suporte da plataforma
   └─ Revenue split: 70% educador / 30% plataforma

2. EDUCADOR PROFISSIONAL
   └─ Múltiplos cursos em especialidade
   └─ Marketing prioritário
   └─ Revenue split: 75% educador / 25% plataforma

3. EDUCADOR INSTITUCIONAL
   └─ Universidades/Institutos certificados
   └─ Cursos avançados
   └─ Revenue split: 80% educador / 20% plataforma
```

### Processo de Onboarding

```
ETAPA 1: Aplicação
├─ Formulário de candidatura
├─ Verificação de qualificações (diploma/certificado)
├─ Aprovação automática (IA) + revisão manual
└─ Tempo: 24-48 horas

ETAPA 2: Setup do Perfil
├─ Bio profissional com foto
├─ Certificações/credenciais
├─ Redes sociais (LinkedIn, portfolio)
├─ Área(s) de especialidade
└─ Tempo: 30 minutos

ETAPA 3: Criação do Primeiro Curso
├─ Template passo-a-passo
├─ Upload de vídeos (até 4GB cada)
├─ Estrutura mínima:
│  ├─ 5+ aulas
│  ├─ 15+ minutos de conteúdo
│  ├─ Descrição detalhada
│  └─ Imagem de capa (1920x1080)
├─ Revisão de qualidade
└─ Tempo: 2-4 horas

ETAPA 4: Publicação & Monetização
├─ Configuração de preço
├─ Banco de dados para recebimentos
├─ Estatísticas de desempenho
└─ Pronto para vender!
```

---

## 💳 Sistema de Pagamentos {#pagamentos}

### Métodos Suportados

```
1. MOBILE MONEY (M-Pesa)
   └─ Para clientes moçambicanos
   └─ Integration: M-Pesa API
   └─ Taxa: 2% + MZN 1.50
   └─ Instantâneo

2. TRANSFERÊNCIA BANCÁRIA
   └─ Depósito direto
   └─ Para educadores recebimento
   └─ Taxa: Sem taxa da plataforma
   └─ 1-3 dias úteis

3. CARTÃO DE CRÉDITO
   └─ Via Stripe
   └─ Internacional
   └─ Taxa: 2.9% + $0.30
   └─ Instantâneo

4. VOUCHERS/CUPONS
   └─ Promocionais
   └─ Para parceiros
   └─ Desconto até 100%
```

### Fluxo de Pagamento

```
CLIENTE:
  Aluno → Seleciona Curso → Clica "Inscrever-se"
         → Escolhe método de pagamento
         → Paga (M-Pesa, Cartão, etc)
         → Confirmação por email
         → Acesso imediato

EDUCADOR:
  Ganha → Saldo acumula na plataforma
        → Requisita saque (mínimo MZN 500)
        → Transferência bancária em 1-3 dias
        → Recebe no banco
```

### Segurança

```
✅ Certificado SSL/TLS
✅ PCI DSS Compliant
✅ Criptografia End-to-End
✅ Verificação 2FA
✅ Proteção contra fraude (Stripe Radar)
```

---

## 📚 Portal de Literatura Aberta {#literatura}

### Conceito

Portal centralizado com acesso a:
- ✅ Literatura de domínio público
- ✅ Artigos académicos (Creative Commons)
- ✅ Publicações open access
- ✅ Pesquisa de autores moçambicanos

### Estrutura

```
┌─────────────────────────────────────────────┐
│    PORTAL DE LITERATURA ABERTA              │
│         (LitAberta.eduguard360)             │
└─────────────────────────────────────────────┘

1. CATALOGAÇÃO
   ├─ Títulos de domínio público (>10.000)
   ├─ Artigos CC-BY (Creative Commons)
   ├─ Repositórios integrados:
   │  ├─ Open Library (openlibrary.org)
   │  ├─ Project Gutenberg
   │  ├─ arXiv (artigos científicos)
   │  ├─ SSRN (pesquisa académica)
   │  └─ Repoarte.ac.mz (Moçambique)
   └─ Metadata automático

2. DESCOBERTA
   ├─ Busca por autor, título, tema
   ├─ Filtros: tipo, idioma, ano
   ├─ Recomendações por cursos
   ├─ Coleções temáticas
   └─ Trending (mais lido)

3. LEITURA
   ├─ Visualizador web integrado
   ├─ Download (PDF, ePUB, mobi)
   ├─ Anotações e grifos
   ├─ Partilha de citações
   └─ Modo offline

4. INTEGRAÇÃO COM CURSOS
   ├─ Educadores linkam literatura
   ├─ Referências automáticas na aula
   ├─ Quiz baseado em leitura
   └─ Discussão em fórum
```

### Fontes de Dados

```
🌐 INTERNACIONAL
├─ Open Library API
├─ Google Books (domínio público)
├─ Project Gutenberg (>70.000 livros)
├─ Standard Ebooks (clássicos)
├─ Internet Archive (Wayback Machine)
└─ Open Access Journal Aggregators

🇲🇿 MOÇAMBIQUE
├─ Repoarte.ac.mz (Repositório ELTE/UEM)
├─ Teses ISCTE & similares
├─ Publicações de autores moçambicanos
├─ Base de dados nacional
└─ Colaboração com bibliotecas
```

---

## 👥 Fluxos de Usuário {#fluxos}

### Fluxo 1: Aluno Novo

```
1. Landing → Cria conta
2. Explora catálogo de cursos
3. Vê prévia grátis (2 primeiras aulas)
4. Lê avaliações de outros alunos
5. Faz pagamento (M-Pesa/Cartão)
6. Acesso imediato ao curso completo
7. Estuda a próprio ritmo
8. Completa quizzes/exercícios
9. Obtém certificado digital
10. Partilha em LinkedIn
```

### Fluxo 2: Educador

```
1. Candidata-se como educador
2. Perfil aprovado em 24-48h
3. Cria primeiro curso
   - Estrutura: 5+ aulas, 15+ min de vídeo
   - Upload de materiais
   - Setup de preço
4. Curso publicado
5. Recebe alunos
6. Interage em fórum/chat
7. Ganha comissão por aluno
8. Requisita saque → Transferência bancária
```

### Fluxo 3: Pesquisador/Estudante Avançado

```
1. Acede Portal de Literatura
2. Busca tema específico
3. Encontra artigos CC + livros domínio público
4. Faz anotações no leitor web
5. Descarrega em PDF/ePUB
6. Partilha citação em Twitter/Academia.edu
7. Vê recomendação de curso complementar
```

---

## 📊 Métricas de Sucesso

```
PLATAFORMA
├─ 1000+ cursos em 12 meses
├─ 50.000+ alunos inscritos
├─ Taxa conclusão: 35%+
└─ Satisfação: 4.5+ estrelas

EDUCADORES
├─ 200+ educadores certificados
├─ Ganho médio: MZN 50.000/ano
└─ Cursos com 100+ alunos

LITERATURA
├─ 50.000+ títulos acessíveis
├─ 100.000+ downloads/mês
└─ 10+ universidades parceiras
```

---

## 🛠️ Stack Tecnológico

```
FRONTEND
├─ React 18 + TypeScript
├─ Vite (build)
├─ Tailwind CSS
├─ Radix UI (componentes)
└─ TanStack Query (dados)

BACKEND
├─ Node.js + Express
├─ PostgreSQL (dados)
├─ Redis (cache)
├─ S3 (vídeos/PDFs)
└─ Stripe + M-Pesa API

INTEGRAÇÕES
├─ Stripe (pagamentos)
├─ M-Pesa (moçambique)
├─ AWS S3 (armazenamento)
├─ SendGrid (emails)
├─ HLS (streaming vídeo)
└─ Elasticsearch (busca)
```

---

**Próximas Etapas:**
1. ✅ Desenhar arquitetura ← **AGORA**
2. ⬜ Implementar backend de pagamentos
3. ⬜ Criar UI para criação de cursos
4. ⬜ Integrar portal de literatura
5. ⬜ Testes de carga
6. ⬜ Deploy em produção

