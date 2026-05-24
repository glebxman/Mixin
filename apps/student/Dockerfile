# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/student/package.json ./apps/student/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/config/package.json ./packages/config/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/student ./apps/student
RUN pnpm --filter @edtech/student build

# ─── Runtime: nginx serves static files ────────────────────
FROM nginx:alpine AS runtime
COPY --from=build /repo/apps/student/dist /usr/share/nginx/html
COPY apps/student/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
