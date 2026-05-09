# 🌐 EcoTrade360 - Especificação de API (OpenAPI 3.0)

## 📋 Resumo

API RESTful para EcoTrade360 - Plataforma de reciclagem com geolocalização.

**Base URL:** `https://api.ecotrade360.pt/v1`

**Autenticação:** Bearer Token (JWT)

---

## 🔐 Autenticação (Auth Endpoints)

### 1. Enviar OTP

**Enviar código OTP para número de telefone**

```http
POST /auth/send-otp
Content-Type: application/json

{
  "phone": "+351912345678"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "OTP enviado",
  "expires_in": 600,
  "request_id": "uuid"
}
```

**Response 400:**
```json
{
  "error": "Phone format invalid",
  "code": "INVALID_PHONE"
}
```

---

### 2. Verificar OTP

**Verificar código OTP e obter token**

```http
POST /auth/verify-otp
Content-Type: application/json

{
  "phone": "+351912345678",
  "code": "123456"
}
```

**Response 200:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+351912345678",
    "name": "João Silva",
    "is_new": false
  },
  "tokens": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 3600
  }
}
```

**Response 401:**
```json
{
  "error": "Invalid OTP",
  "code": "INVALID_OTP",
  "attempts_left": 2
}
```

---

### 3. Refresh Token

**Renovar token de acesso**

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

**Response 200:**
```json
{
  "success": true,
  "access_token": "eyJhbGc...",
  "expires_in": 3600
}
```

---

### 4. Logout

**Fazer logout (invalidar tokens)**

```http
POST /auth/logout
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Logout realizado"
}
```

---

### 5. Obter Utilizador Atual

**Get dados do utilizador autenticado**

```http
GET /auth/me
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "id": "uuid",
  "phone": "+351912345678",
  "name": "João Silva",
  "email": "joao@example.com",
  "avatar_url": "https://...",
  "rating": 4.8,
  "total_reviews": 15,
  "role": "both",
  "created_at": "2026-01-15T10:30:00Z"
}
```

---

## 👤 Utilizadores (Users Endpoints)

### 1. Obter Perfil de Utilizador

**Get dados públicos de um utilizador**

```http
GET /users/{id}
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "avatar_url": "https://...",
  "rating": 4.8,
  "total_reviews": 15,
  "bio": "Reciclador ativo",
  "created_at": "2026-01-15T10:30:00Z",
  "stats": {
    "total_listings": 42,
    "completed_sales": 38,
    "response_time_hours": 2.5
  }
}
```

---

### 2. Atualizar Perfil

**Atualizar dados do utilizador**

```http
PUT /users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "João Silva Updated",
  "email": "newemail@example.com",
  "bio": "Bio atualizada",
  "avatar_url": "https://..."
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "João Silva Updated",
  "email": "newemail@example.com",
  "bio": "Bio atualizada",
  "updated_at": "2026-05-01T14:20:00Z"
}
```

---

### 3. Obter Avaliações do Utilizador

**List todas as avaliações recebidas**

```http
GET /users/{id}/ratings?page=1&limit=10
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "from_user": {
        "id": "uuid",
        "name": "Maria"
      },
      "score": 5,
      "comment": "Excelente transação!",
      "created_at": "2026-04-28T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15
  }
}
```

---

### 4. Obter Anúncios do Utilizador

**List anúncios criados por um utilizador**

```http
GET /users/{id}/listings?status=available&page=1&limit=20
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Plástico de garrafas",
      "type": "plastic",
      "weight": 5.5,
      "price": 12.50,
      "status": "available",
      "images": ["url1", "url2"],
      "created_at": "2026-04-30T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

---

## 📦 Anúncios (Listings Endpoints)

### 1. Criar Anúncio

**Criar novo anúncio de lixo**

```http
POST /listings
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Plástico de garrafas",
  "description": "Garrafas plásticas limpas",
  "type": "plastic",
  "weight": 5.5,
  "price": 12.50,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "address": "Rua das Flores, Lisboa",
  "city": "Lisboa",
  "postal_code": "1000-000",
  "images": [
    {
      "url": "base64-or-url",
      "order": 0
    }
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Plástico de garrafas",
    "type": "plastic",
    "weight": 5.5,
    "price": 12.50,
    "status": "available",
    "created_at": "2026-05-01T10:30:00Z",
    "expires_at": "2026-06-01T10:30:00Z"
  }
}
```

---

### 2. Listar Anúncios

**Listar anúncios com filtros**

```http
GET /listings?type=plastic&status=available&distance=5&latitude=40.7128&longitude=-74.0060&page=1&limit=20
Authorization: Bearer {token}
```

**Query Parameters:**
- `type`: plastic, metal, paper, glass, organic, electronics, textiles
- `status`: available, reserved, completed
- `distance`: raio em km (default: 10)
- `latitude`, `longitude`: coordenadas do utilizador
- `min_price`, `max_price`: range de preço
- `min_weight`, `max_weight`: range de peso
- `sort_by`: price_asc, price_desc, distance_asc, distance_desc, created_desc
- `page`, `limit`: paginação

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Plástico de garrafas",
      "type": "plastic",
      "weight": 5.5,
      "price": 12.50,
      "status": "available",
      "address": "Rua das Flores, Lisboa",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "distance_km": 2.3,
      "images": ["url1", "url2"],
      "seller": {
        "id": "uuid",
        "name": "João",
        "rating": 4.8
      },
      "created_at": "2026-04-30T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 3. Obter Detalhes do Anúncio

**Get informações completas de um anúncio**

```http
GET /listings/{id}
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Plástico de garrafas",
    "description": "Garrafas plásticas limpas",
    "type": "plastic",
    "weight": 5.5,
    "price": 12.50,
    "status": "available",
    "address": "Rua das Flores, Lisboa",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "images": ["url1", "url2", "url3"],
    "view_count": 42,
    "seller": {
      "id": "uuid",
      "name": "João Silva",
      "avatar": "https://...",
      "rating": 4.8,
      "total_reviews": 15
    },
    "created_at": "2026-04-30T14:20:00Z",
    "expires_at": "2026-06-01T10:30:00Z",
    "can_reserve": true,
    "reserved_by": null
  }
}
```

---

### 4. Atualizar Anúncio

**Editar anúncio (apenas seller)**

```http
PUT /listings/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Plástico - ATUALIZADO",
  "price": 15.00,
  "weight": 6.0,
  "description": "Garrafas plásticas limpas - quantidade aumentada"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Plástico - ATUALIZADO",
    "price": 15.00,
    "weight": 6.0,
    "updated_at": "2026-05-01T15:00:00Z"
  }
}
```

---

### 5. Deletar Anúncio

**Remover anúncio (apenas seller)**

```http
DELETE /listings/{id}
Authorization: Bearer {token}
```

**Response 204:**
(Sem body)

---

## ✅ Reservas (Reservations Endpoints)

### 1. Criar Reserva

**Fazer reserva de um anúncio**

```http
POST /listings/{id}/reserve
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "Pode ser hoje à noite?"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "listing_id": "uuid",
    "buyer_id": "uuid",
    "status": "active",
    "reserved_at": "2026-05-01T10:00:00Z",
    "expires_at": "2026-05-01T12:00:00Z"
  }
}
```

**Response 409:**
```json
{
  "error": "Listing already reserved",
  "code": "ALREADY_RESERVED"
}
```

---

### 2. Cancelar Reserva

**Cancelar uma reserva**

```http
POST /listings/{id}/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Mudei de ideias"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancelled_at": "2026-05-01T10:30:00Z"
  }
}
```

---

### 3. Completar Transação

**Marcar transação como concluída**

```http
POST /listings/{id}/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "photos": ["url1", "url2"]
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "2026-05-01T14:20:00Z"
  }
}
```

---

### 4. Obter Minhas Reservas

**Listar reservas do utilizador (como buyer ou seller)**

```http
GET /reservations?role=buyer&status=active&page=1&limit=10
Authorization: Bearer {token}
```

**Query Parameters:**
- `role`: buyer, seller
- `status`: active, completed, cancelled, expired
- `page`, `limit`: paginação

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "listing": {
        "id": "uuid",
        "title": "Plástico de garrafas",
        "type": "plastic",
        "price": 12.50
      },
      "counterpart": {
        "id": "uuid",
        "name": "João Silva",
        "rating": 4.8
      },
      "status": "active",
      "reserved_at": "2026-05-01T10:00:00Z",
      "expires_at": "2026-05-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

---

## ⭐ Avaliações (Ratings Endpoints)

### 1. Criar Avaliação

**Avaliar um utilizador após transação**

```http
POST /ratings
Authorization: Bearer {token}
Content-Type: application/json

{
  "to_user": "uuid",
  "listing_id": "uuid",
  "score": 5,
  "comment": "Excelente transação, muito profissional!",
  "is_seller_rating": false
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "from_user": "uuid",
    "to_user": "uuid",
    "score": 5,
    "comment": "Excelente transação, muito profissional!",
    "created_at": "2026-05-01T15:30:00Z"
  }
}
```

---

### 2. Obter Avaliação

**Get uma avaliação específica**

```http
GET /ratings/{id}
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "from_user": {
      "id": "uuid",
      "name": "Maria"
    },
    "to_user": {
      "id": "uuid",
      "name": "João"
    },
    "score": 5,
    "comment": "Excelente!",
    "created_at": "2026-05-01T15:30:00Z"
  }
}
```

---

## 🔔 Notificações (Notifications Endpoints)

### 1. Listar Notificações

**Obter notificações do utilizador**

```http
GET /notifications?unread=true&page=1&limit=20
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Novo anúncio perto de ti!",
      "body": "Plástico a 2km de distância",
      "type": "new_listing",
      "related_listing_id": "uuid",
      "is_read": false,
      "created_at": "2026-05-01T14:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "unread_count": 3
  }
}
```

---

### 2. Marcar como Lida

**Marcar notificação como lida**

```http
PUT /notifications/{id}/read
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_read": true,
    "read_at": "2026-05-01T15:00:00Z"
  }
}
```

---

## 📊 Analytics (Admin Endpoints)

### 1. Overview

**Dashboard de métricas principais**

```http
GET /admin/analytics/overview
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_listings": 1245,
    "total_users": 567,
    "total_reservations": 892,
    "total_completed": 789,
    "completion_rate": 0.886,
    "avg_rating": 4.7,
    "active_users_today": 123,
    "new_listings_today": 45,
    "total_waste_kg": 4567.8,
    "total_value_moved": 12345.67
  }
}
```

---

### 2. Heatmap

**Dados geoespaciais de atividade**

```http
GET /admin/analytics/heatmap?zoom=10
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "intensity": 0.95,
      "listings_count": 127
    }
  ]
}
```

---

## 🔥 Mensagens de Erro Padrão

### 400 Bad Request

```json
{
  "error": "Invalid input",
  "code": "INVALID_INPUT",
  "details": {
    "field": "phone",
    "message": "Phone format invalid"
  }
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "message": "Token expired or invalid"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "code": "FORBIDDEN",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "Resource not found",
  "code": "NOT_FOUND",
  "resource": "listing"
}
```

### 409 Conflict

```json
{
  "error": "Conflict",
  "code": "CONFLICT",
  "message": "Listing already reserved"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "message": "Something went wrong"
}
```

---

## ⏱️ Rate Limiting

- **OTP:** 5 tentativas por número de telefone / 15 minutos
- **API Geral:** 100 requests / minuto por utilizador
- **Upload:** 5 imagens / minuto

---

## 🔐 Headers Obrigatórios

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Request-ID: {unique-id} (opcional)
```

---

## 📝 Códigos de Status HTTP

| Status | Significado |
|--------|------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

**Versão:** 1.0
**Última atualização:** 2026-05-01
**Status:** ✅ Completo

