# syntax=docker/dockerfile:1

# ---- deps: install dependencies (build tools available for native modules) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js standalone output ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: minimal runtime image ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_TZ=Europe/Paris \
    DATABASE_PATH=/data/medocs.db

RUN useradd --create-home --uid 1001 medocs \
    && mkdir -p /data && chown medocs:medocs /data

# Standalone server + the assets it needs (Next does not copy these itself).
COPY --from=builder --chown=medocs:medocs /app/.next/standalone ./
COPY --from=builder --chown=medocs:medocs /app/.next/static ./.next/static
COPY --from=builder --chown=medocs:medocs /app/public ./public

USER medocs
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
