FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm ci

COPY backend/src ./src
COPY backend/tsconfig.json ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
