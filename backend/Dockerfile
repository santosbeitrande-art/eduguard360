FROM node:18-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV TS_NODE_TRANSPILE_ONLY=1

COPY backend/package*.json ./
RUN npm ci

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/tsconfig.json ./

EXPOSE 3000

CMD ["sh", "-c", "node --require ts-node/register/transpile-only ./node_modules/typeorm/cli.js -d src/config/typeorm.datasource.ts migration:run && if [ \"${BUILDING360_AUTO_SEED:-1}\" = \"1\" ]; then node ./scripts/seed-building360-core-demo.cjs || true; fi && node --require ts-node/register/transpile-only src/main.ts"]
