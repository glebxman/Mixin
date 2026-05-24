# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

# ─── Install ────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY services/api/package.json ./services/api/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ─── Build ──────────────────────────────────────────────────
FROM deps AS build
COPY packages ./packages
COPY services/api ./services/api
RUN pnpm --filter @edtech/db generate
RUN pnpm --filter @edtech/api build

# ─── Runtime ────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# wget is part of node:20-alpine and is used by HEALTHCHECK below.
# Create a non-root user; the runtime never executes as root.
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate \
 && addgroup -S app && adduser -S app -G app

# Copy only the files needed at runtime: workspace manifests, packages,
# the compiled service output, and the service's package.json. No source,
# no dev tooling.
COPY --from=build --chown=app:app /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/turbo.json ./
COPY --from=build --chown=app:app /repo/packages ./packages
COPY --from=build --chown=app:app /repo/services/api/package.json ./services/api/
COPY --from=build --chown=app:app /repo/services/api/dist ./services/api/dist

# Production dependencies only (`--prod` skips devDependencies).
RUN pnpm install --frozen-lockfile --prod \
 && chown -R app:app /app

USER app

EXPOSE 3001
WORKDIR /app/services/api

# /health is the documented probe endpoint; see services/api/src/app.ts.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "dist/server.js"]
