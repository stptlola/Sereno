# syntax=docker/dockerfile:1.7
# Image de production Sereno : Next.js en mode standalone + migrations Prisma au démarrage.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Dépendances, installées à partir du fichier de verrouillage
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# 2. Construction
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx next build

# 3. Image finale, minimale, exécutée sans droits administrateur
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Paris
# La CLI Prisma sert uniquement à appliquer les migrations au démarrage.
RUN apk add --no-cache tzdata && npm install -g prisma@6.19.3 && npm cache clean --force
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/data ./data
COPY --chown=node:node scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
