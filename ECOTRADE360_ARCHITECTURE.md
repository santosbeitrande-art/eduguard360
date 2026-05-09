# 🏗️ Arquitetura Técnica – EcoTrade360

## 🎯 Visão geral da arquitetura

**Modelo recomendado:** Arquitetura Cloud + Mobile-first + API-first

```
[App Mobile] ─┐
              ├──> [API Backend] ───> [Base de Dados]
[Web App]  ───┘           │
                          ├──> [Serviço de Mapas]
                          ├──> [Serviço de Notificações]
                          └──> [Storage de Imagens]
```

---

## 📱 1. Frontend (Cliente)

### 🔹 Mobile App (prioridade)

**Tecnologia recomendada:**

- **Flutter** (1 código → Android + iOS) ✅ Recomendado
- **React Native** (alternativa)

### 🔹 Funcionalidades principais

#### 👤 **Autenticação**

Login via:
- Número de telefone (OTP)
- WhatsApp (opcional)

#### 📦 **Tela: Criar anúncio**

**Campos:**

| Campo | Tipo | Obrigatório |
|-------|------|------------|
| Foto | Upload (3-5 imagens) | ✅ |
| Tipo de lixo | Dropdown | ✅ |
| Peso | Input (kg) | ✅ |
| Preço | Input ou automático | ✅ |
| Localização | GPS automático | ✅ |
| Descrição | Textarea | ❌ |

#### 🗺️ **Tela: Mapa**

- Pins com lixo disponível
- Cor por status:
  - 🟢 **Disponível**
  - 🟡 **Reservado**
  - 🔴 **Recolhido**

#### 📋 **Tela: Lista**

Cards com:
- Imagem
- Tipo
- Preço
- Distância

#### 🔍 **Filtros**

- Tipo de lixo
- Distância (km)
- Preço (min-max)
- Peso

#### 📄 **Tela: Detalhes do anúncio**

- Fotos (carousel)
- Informações completas
- Botão: **"Aceitar Recolha"**
- Informações do vendedor + rating

#### ✅ **Tela: Minhas atividades**

- Anúncios criados
- Reservas feitas
- Histórico
- Avaliações

#### 🌐 **Web App (Dashboard)**

Interface para gestão administrativa e visualização de dados

---

## 🌐 2. Backend (API)

### 🔹 Tecnologia recomendada

**Para MVP rápido:**
- Firebase (Firestore + Auth + Storage)

**Para escala (Startup):**
- Node.js + NestJS
- PostgreSQL
- Redis (cache)

### 🔹 Estrutura de API (REST)

#### 🔐 **Auth Endpoints**

```http
POST   /auth/send-otp
POST   /auth/verify-otp
GET    /auth/me
POST   /auth/logout
```

#### 👤 **Users Endpoints**

```http
GET    /users/{id}
PUT    /users/{id}
DELETE /users/{id}
GET    /users/{id}/ratings
GET    /users/{id}/listings
```

#### 📦 **Listings Endpoints**

```http
POST   /listings
GET    /listings
GET    /listings/{id}
PUT    /listings/{id}
DELETE /listings/{id}
GET    /listings?type=plastic&distance=5km&status=available
```

#### ✅ **Reservations Endpoints**

```http
POST   /listings/{id}/reserve
POST   /listings/{id}/cancel
POST   /listings/{id}/complete
GET    /reservations/{id}
```

#### ⭐ **Ratings Endpoints**

```http
POST   /ratings
GET    /users/{id}/ratings
PUT    /ratings/{id}
```

#### 📊 **Analytics Endpoints (Admin)**

```http
GET    /analytics/listings-per-day
GET    /analytics/completion-rate
GET    /analytics/heatmap
```

---

## 🗄️ 3. Base de Dados

### 🔹 Tabelas principais

#### 👤 **Users**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) -- 'seller', 'buyer', 'both'
  avatar_url VARCHAR(255),
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_reviews INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 📦 **Listings**

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL FOREIGN KEY REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'plastic', 'metal', 'paper', etc
  weight DECIMAL(10,2) NOT NULL, -- em kg
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'reserved', 'completed'
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Para limpeza automática
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 📸 **Images**

```sql
CREATE TABLE images (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL FOREIGN KEY REFERENCES listings(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 📌 **Reservations**

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  listing_id UUID NOT NULL FOREIGN KEY REFERENCES listings(id),
  buyer_id UUID NOT NULL FOREIGN KEY REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- 2h por padrão
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### ⭐ **Ratings**

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  from_user UUID NOT NULL FOREIGN KEY REFERENCES users(id),
  to_user UUID NOT NULL FOREIGN KEY REFERENCES users(id),
  listing_id UUID FOREIGN KEY REFERENCES listings(id),
  score INT CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🗺️ 4. Geolocalização

### 🔹 Ferramentas

- **Google Maps API** (robusto)
- **Mapbox** (mais barato)

### 🔹 Funções

- Obter localização do utilizador (GPS)
- Calcular distância entre pontos
- Mostrar pins no mapa com cor por status
- Área de busca (raio em km)

### 🔹 Integração

```typescript
// Exemplo: Buscar anúncios num raio de 5km
GET /listings?latitude=40.7128&longitude=-74.0060&radius=5
```

---

## 🖼️ 5. Upload de imagens

### 🔹 Opções

- **Firebase Storage** (rápido, simples)
- **AWS S3** (escalável)

### 🔹 Regras

- ✅ Compressão automática
- ✅ Limite: 3–5 imagens por anúncio
- ✅ Tamanho máx: 5MB por imagem
- ✅ Formatos: JPG, PNG

### 🔹 Pipeline

```
Upload → Validação → Compressão → Storage → Retornar URL
```

---

## 🔔 6. Notificações

### 🔹 Tecnologia

**Firebase Cloud Messaging (FCM)**

### 🔹 Eventos

- 🔔 Novo anúncio perto (geolocalização)
- 🔔 Reserva feita
- 🔔 Cancelamento de reserva
- 🔔 Confirmação de recolha
- 🔔 Nova avaliação

### 🔹 Integração

```typescript
// Exemplo: Enviar notificação
POST /notifications/send
{
  "user_id": "uuid",
  "title": "Novo anúncio perto de ti!",
  "body": "Plástico a 2km de distância",
  "data": {
    "listing_id": "uuid",
    "type": "new_listing"
  }
}
```

---

## 🧠 7. Lógica de negócio crítica

### 🔹 **Regra 1: Reserva única**

```
IF listing.status == "available":
    allow reservation
    SET listing.status = "reserved"
    LOCK listing for other buyers
ELSE:
    BLOCK reservation
    RETURN 409 Conflict
```

### 🔹 **Regra 2: Expiração de reserva**

**Tempo limite:** 2 horas (configurável)

```
IF (CURRENT_TIME - reservation.created_at) > 2 hours:
    SET reservation.status = "expired"
    SET listing.status = "available"
    SEND notification to seller
```

### 🔹 **Regra 3: Sugestão de preço (IA)**

Baseado em:
- Tipo de material
- Peso
- Média histórica
- Oferta/demanda local

```
suggested_price = average_price * (1 + demand_factor)
```

### 🔹 **Regra 4: Avaliação**

- Apenas após conclusão da transação
- Score: 1-5 estrelas
- Comentário opcional

---

## 🔐 8. Segurança

### 🔹 Autenticação

- ✅ OTP (One-Time Password) obrigatório
- ✅ JWT tokens com expiração
- ✅ Refresh tokens para renovação

### 🔹 Rate Limiting

- ✅ Max 5 tentativas de OTP por número
- ✅ Max 100 requests/minuto por utilizador
- ✅ Anti-spam em criação de anúncios

### 🔹 Validação

- ✅ Sanitização de inputs (SQL Injection)
- ✅ Validação de tipos (TypeScript)
- ✅ CORS configurado

### 🔹 Logs

- ✅ Log de todas as ações críticas
- ✅ Rastreamento de transações
- ✅ Monitoramento de erros (Sentry)

---

## 📊 9. Analytics

### 🔹 Métricas importantes

| Métrica | Descrição |
|---------|-----------|
| Nº de anúncios/dia | Volume de criação |
| Taxa de recolha | % de anúncios completados |
| Tempo médio de venda | Tempo até conclusão |
| Zonas com mais atividade | Heatmap |
| Utilizadores ativos | DAU/MAU |
| Taxa de avaliação | % com feedback |

### 🔹 Dashboard

```
📊 Overview
├── Total de anúncios
├── Taxa de conclusão
├── Utilizadores ativos
└── Receita (se aplicável)

🗺️ Heatmap
├── Zonas quentes
├── Zonas dormentes
└── Sugestões de expansão

👥 Utilizadores
├── Novos utilizadores
├── Taxa de retenção
└── Feedback
```

---

## ⚙️ 10. Roadmap técnico (execução)

### 🚀 **Fase 1 – MVP (30 dias)**

- [ ] Login OTP
- [ ] Criar anúncio (foto + dados)
- [ ] Listar anúncios
- [ ] Reservar anúncio
- [ ] Mapa básico
- [ ] Testes unitários

**Objetivo:** Versão funcional mínima para testes

### 🚀 **Fase 2 (30-60 dias)**

- [ ] Sistema de avaliações
- [ ] Notificações FCM
- [ ] Histórico de transações
- [ ] Filtros avançados
- [ ] Chat básico seller-buyer
- [ ] Beta tester group

**Objetivo:** Fechar loop de transação completo

### 🚀 **Fase 3 (60-90 dias)**

- [ ] IA de preço dinâmico
- [ ] Sistema de ranking/reputação
- [ ] Integração com EduGuard360
- [ ] Analytics dashboard
- [ ] Otimizações de performance

**Objetivo:** Escalabilidade e diferencial

---

## 👨💻 11. Equipa mínima

| Papel | Responsabilidades | Tempo |
|-------|-------------------|-------|
| **Dev Mobile** | Flutter/React Native | Full-time |
| **Dev Backend** | API, BD, Lógica | Full-time |
| **UI/UX** | Design, User Testing | Part-time |
| **DevOps** | Deploy, CI/CD | Shared |

---

## 💡 12. Decisão crítica (recomendação direta)

### 👉 **Se queres velocidade:**

**Use Firebase**

```
✅ Autenticação pronta
✅ Firestore (BD NoSQL)
✅ Storage para imagens
✅ Cloud Functions (serverless)
✅ FCM para notificações
✅ Analytics built-in
```

**Tempo para MVP:** 2-3 semanas

### 👉 **Se queres escalar como startup:**

**Use Node.js + PostgreSQL + AWS**

```
✅ Arquitetura profissional
✅ Escalabilidade garantida
✅ Custo controlável
✅ Flexibilidade total
✅ Ecosystem rico (NestJS)
```

**Tempo para MVP:** 4-6 semanas

---

## 🏛️ 13. Arquitetura de Pastas (Backend recomendado)

```
backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── jwt.strategy.ts
│   ├── listings/
│   │   ├── listings.controller.ts
│   │   ├── listings.service.ts
│   │   └── listing.entity.ts
│   ├── reservations/
│   ├── users/
│   ├── ratings/
│   ├── notifications/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── config/
│   ├── middleware/
│   ├── guards/
│   └── main.ts
├── test/
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## 🏛️ 14. Arquitetura de Pastas (Frontend Mobile)

```
mobile/
├── lib/
│   ├── screens/
│   │   ├── auth/
│   │   ├── listings/
│   │   ├── map/
│   │   ├── reservations/
│   │   └── profile/
│   ├── models/
│   ├── services/
│   ├── widgets/
│   ├── utils/
│   └── main.dart
├── test/
├── pubspec.yaml
└── README.md
```

---

## 🔥 15. Próximos passos imediatos

### ✅ Semana 1-2: Planeamento

- [ ] Escolher entre Firebase vs Node.js + PostgreSQL
- [ ] Setup repositório Git
- [ ] Criar backlog no Jira/GitHub Projects
- [ ] Design de wireframes
- [ ] Definir API contracts (Swagger/OpenAPI)

### ✅ Semana 3-4: Dev

- [ ] Setup dev environment
- [ ] Iniciar Backend (Auth + Listings básico)
- [ ] Iniciar Mobile (Login + Mapa básico)
- [ ] Testes iniciais

### ✅ Semana 5+: Beta

- [ ] Testes com grupo beta
- [ ] Feedback e iterações
- [ ] Performance tuning
- [ ] Preparar launch

---

## 🎯 Conclusão direta

**Tecnicamente, isto é totalmente viável e relativamente simples.**

O diferencial não vai ser tecnologia — vai ser:

👉 **A adoção das pessoas**
👉 **A confiança no sistema**
👉 **A execução no terreno**

---

## 📞 Contato & Suporte

Para dúvidas técnicas específicas, consulte:
- 📖 Documentação interna
- 🤝 Code reviews semanais
- 📊 Sprint planning sessions

---

**Última atualização:** 2026-05-01
**Status:** ✅ Documento Base Completo
