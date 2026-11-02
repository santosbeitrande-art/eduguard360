FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY backend/scripts ./scripts
COPY backend/certs ./certs

EXPOSE 3000

CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js -d dist/config/typeorm.datasource.js migration:run && if [ \"${BUILDING360_AUTO_SEED:-0}\" = \"1\" ]; then node ./scripts/seed-building360-core-demo.cjs; fi && node dist/main.js"]
