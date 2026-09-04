# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY apps/admin/package.json apps/admin/package.json
RUN pnpm install --frozen-lockfile --filter @ptg/admin...

FROM deps AS build
COPY packages packages
# See apps/api/Dockerfile: the package builds reach back into scripts/.
COPY scripts scripts
COPY apps/admin apps/admin
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
# Where the console will be mounted. '/' for a dedicated origin, '/admin/' when
# it shares one with the web app - see apps/admin/vite.config.ts.
ARG ADMIN_BASE_PATH=/
ENV ADMIN_BASE_PATH=$ADMIN_BASE_PATH
# @ptg/types and @ptg/config resolve to their compiled dist/ (ADR 0003), so
# `tsc -b` here cannot see them until they are built - without this the app
# build fails with "Cannot find module '@ptg/types'" on every import of it.
RUN pnpm --filter @ptg/types --filter @ptg/config build
RUN pnpm --filter @ptg/admin build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
COPY infra/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
