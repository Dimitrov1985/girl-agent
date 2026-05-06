# ── Stage 1: сборка ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: рантайм ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Только production-зависимости
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Собранный бандл из stage 1
COPY --from=builder /app/dist ./dist

# Данные профилей монтируются снаружи
VOLUME ["/app/data"]

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENTRYPOINT ["entrypoint.sh"]
