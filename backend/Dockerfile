FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV TS_NODE_TRANSPILE_ONLY=1

COPY backend/package*.json ./
RUN npm ci

COPY backend/src ./src
COPY backend/tsconfig.json ./

EXPOSE 3000

CMD ["node", "--require", "ts-node/register/transpile-only", "src/main.ts"]
