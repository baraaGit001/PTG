# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
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

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
