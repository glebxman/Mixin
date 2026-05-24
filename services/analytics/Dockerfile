# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY services/analytics/package.json ./services/analytics/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages ./packages
COPY services/analytics ./services/analytics
RUN pnpm --filter @edtech/db generate
RUN pnpm --filter @edtech/analytics build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/turbo.json ./
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/services/analytics/package.json ./services/analytics/
COPY --from=build /repo/services/analytics/dist ./services/analytics/dist

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3002
WORKDIR /app/services/analytics
CMD ["node", "dist/server.js"]
