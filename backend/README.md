# EcoTrade360 Backend

API RESTful para a plataforma EcoTrade360 - Marketplace de Reciclagem

## 📦 Pré-requisitos

- Node.js v18+
- PostgreSQL 15+
- Docker (opcional)

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env` e configure as variáveis necessárias.

### 3. Setup Database

```bash
# Criar database
psql -U postgres
CREATE DATABASE ecotrade360;
CREATE USER ecotrade_app WITH PASSWORD 'secure_password';
ALTER ROLE ecotrade_app SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE ecotrade360 TO ecotrade_app;
\q
```

### 4. Rodar Servidor

```bash
npm run dev
```

Servidor deve estar disponível em: http://localhost:3000

## 🐳 Docker

### Rodar com Docker Compose

```bash
docker-compose up -d
```

### Parar Containers

```bash
docker-compose down
```

## 📚 Endpoints Principais

### Autenticação

```http
POST /api/v1/auth/send-otp
{
  "phone": "+351912345678"
}

POST /api/v1/auth/verify-otp
{
  "phone": "+351912345678",
  "code": "123456"
}

GET /api/v1/auth/me
Authorization: Bearer {token}
```

### Anúncios

```http
GET /api/v1/listings
GET /api/v1/listings/:id
POST /api/v1/listings
PUT /api/v1/listings/:id
DELETE /api/v1/listings/:id
```

## 🧪 Testes

```bash
npm test
```

## 📖 Documentação

Ver [ECOTRADE360_API_SPECIFICATION.md](../ECOTRADE360_API_SPECIFICATION.md)

## 📞 Suporte

Para dúvidas, contate o tech lead do projeto.
