# Rollout Checklist

## 1. Pré-requisitos do host

- Docker Desktop ou execução manual de serviços
- Python disponível
- Node.js disponível
- PostgreSQL acessível
- Redis acessível

## 2. Variáveis de ambiente

Use `eduguard/.env.services.example` como base.

Obrigatórias:

- `VERIFY_PG_URL`
- `REDIS_URL`
- `OCR_SERVICE_URL`
- `VISION_SERVICE_URL`
- `FORENSICS_SERVICE_URL`

## 3. Base de dados

Aplicar:

- `eduguard/verify-api/sql/002_verify_ai_postgres_schema.sql`

ou executar:

```powershell
cd eduguard/verify-api
npm run db:migrate:pg
```

## 4. Modelos pesados

Use `eduguard/model_assets.example.json` para mapear pesos e datasets.

Mínimo recomendado:

- YOLO treinado para logos, selos, assinaturas e QR regions
- Detectron2 para layout e objetos documentais
- Segment Anything para regiões editadas
- PaddleOCR e EasyOCR para acordo entre motores OCR

## 5. Fontes públicas reais

Catálogo inicial:

- `eduguard/public_sources.mz.example.json`

Fontes verificadas neste ambiente:

- `https://www.uem.mz`
- `https://admissao.uem.mz`
- `https://webmail.uem.mz`

## 6. Arranque manual

```powershell
cd eduguard
./rollout-manual.ps1
```

## 7. Arranque por containers

```powershell
cd eduguard
docker compose -f services-compose.yml up --build
```

## 8. Validação final

- `/health` do verify-api
- `/health` de OCR, visão e forense
- `POST /upload` com um documento de teste
- `GET /status/:id/evidence`
- `GET /quality/dashboard`