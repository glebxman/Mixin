# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY services/integrations/package.json ./services/integrations/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages ./packages
COPY services/integrations ./services/integrations
RUN pnpm --filter @edtech/db generate
RUN pnpm --filter @edtech/integrations build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/turbo.json ./
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/services/integrations/package.json ./services/integrations/
COPY --from=build /repo/services/integrations/dist ./services/integrations/dist

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3003
WORKDIR /app/services/integrations
CMD ["node", "dist/server.js"]
