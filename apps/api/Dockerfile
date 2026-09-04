# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
# Prisma probes the libssl version to pick its query engine. Without openssl
# installed the probe fails, it falls back to an openssl-1.1.x engine, and
# loading that against Alpine's openssl 3 dies with "libssl.so.1.1: not found".
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* .npmrc* ./
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @ptg/api...

FROM deps AS build
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @ptg/api db:generate --schema=apps/api/prisma/schema.prisma || pnpm --filter @ptg/api exec prisma generate
# @ptg/types and @ptg/config resolve to their compiled dist/, so they have to be
# built before the API that requires them at runtime.
RUN pnpm --filter @ptg/types --filter @ptg/config build
RUN pnpm --filter @ptg/api build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
RUN corepack enable
ENV NODE_ENV=production
# pnpm's node_modules is a symlink farm: @ptg/config and @ptg/types resolve
# through links into /repo/packages, and the rest through /repo/node_modules/.pnpm.
# Those links only resolve if the runtime keeps the same layout the install was
# made in, so the tree is copied to /repo rather than flattened into /app.
WORKDIR /repo
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/dist ./apps/api/dist
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
