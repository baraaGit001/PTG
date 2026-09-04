# PTG Business

A production-shaped rebuild of the PTG Business partner/marketplace platform: a
public guest marketplace, an authenticated partner portal (wallet, network
trees, bonuses, orders), a full e-commerce marketplace, a health/community
feature area, and a back-office admin console — all backed by one REST API
with a Postgres ledger as the single source of truth for money and points.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md), [API.md](docs/API.md),
[DATABASE.md](docs/DATABASE.md), [SECURITY.md](docs/SECURITY.md),
[DEPLOYMENT.md](docs/DEPLOYMENT.md) and [DEVELOPMENT.md](docs/DEVELOPMENT.md)
for the deeper documentation.

## Monorepo layout

```
apps/
  web/     Partner + marketplace React app (Vite)     -> http://localhost:5173
  admin/   Back-office React app (Vite)                -> http://localhost:5174
  api/     NestJS + Prisma + PostgreSQL REST API        -> http://localhost:3001

packages/
  ui/              Shared shadcn-style component library
  types/           Shared TypeScript types, DTOs, enums, state machines, money math
  config/          Shared navigation map, business constants, Tailwind preset
  eslint-config/   Shared flat ESLint config
  tsconfig/        Shared tsconfig bases
```

## Prerequisites

- Node.js 22+ (pnpm 11 requires `node:sqlite`, which lands in Node 22)
- pnpm 11.5+ (`corepack enable` will pick up the version pinned in `package.json`)
- Docker (for PostgreSQL, Redis, and local S3-compatible storage via MinIO)

## Quick start

```bash
pnpm install

cp .env.example .env
# fill in real secrets for JWT_SECRET / JWT_REFRESH_SECRET / COOKIE_SECRET
# (32+ random characters each - e.g. `openssl rand -base64 32`)

pnpm docker:up          # postgres, redis, minio

pnpm db:migrate          # applies apps/api/prisma/schema.prisma
pnpm db:seed             # obviously-fake demo data - see prisma/seed.ts

pnpm dev                 # runs api (3001), web (5173) and admin (5174) together
```

Then open:

- Web app: http://localhost:5173
- Admin console: http://localhost:5174
- API docs (Swagger): http://localhost:3001/docs

Seeded sign-ins (see `apps/api/prisma/seed.ts` for the full list), all using
password `Passw0rd!Demo`:

| Member ID     | Role      | App   |
| ------------- | --------- | ----- |
| `PTG-ADMIN`   | SUPER_ADMIN | admin |
| `PTG-100001`  | PARTNER (root of the seeded network) | web |
| `PTG-C0001`   | CUSTOMER  | web |

## Common commands

```bash
pnpm dev                 # all three apps, watch mode
pnpm dev:api              # API only
pnpm dev:web              # web app only
pnpm dev:admin            # admin app only

pnpm build                # build every app/package
pnpm typecheck            # tsc --noEmit across the workspace
pnpm lint                 # eslint across the workspace
pnpm test                 # unit/integration tests across the workspace

pnpm db:migrate            # create/apply a Prisma migration (dev)
pnpm db:migrate:deploy     # apply migrations without prompting (CI/prod)
pnpm db:seed               # re-run the seed script
pnpm db:reset              # drop, recreate, migrate and reseed (destroys local data)

pnpm docker:up / docker:down   # local infra (postgres, redis, minio)
```

Production-shaped containers (API + web + admin + nginx reverse proxy) are
defined in `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## What's implemented

A full feature-by-feature breakdown, the database schema summary, the API
surface, the security posture, and known assumptions live in the docs linked
above. In short: authentication with refresh-token rotation and RBAC; a
transactional wallet/points/bonus ledger; a full marketplace with a
server-authoritative cart and checkout; sponsor and placement network trees
built on a materialized-path schema; health, community, sport-ranking and
content features; and an admin console covering users, catalog, orders,
wallets, bonuses, promotions, investment plans, community moderation,
localization, audit logs and settings.

## Known limitations (read before evaluating)

- **Bonus calculation** is deliberately *not* automated: the brief prohibits
  inventing undocumented bonus formulas, so `BonusRecord`s are created via an
  explicit admin action (or a future, separately-reviewed calculator service)
  rather than an inferred rule.
- **Investment plans** are descriptive configuration only; no return/yield is
  computed anywhere in the codebase.
- **Discount/promotion codes**: `Promotion` models a marketing banner (per the
  brief's IA), not a redeemable coupon; cart/checkout `discount` is always
  zero until a real discount-code business rule is supplied.
- **i18n coverage**: all five locales (en, ar, ja, zh-CN, es) are wired end to
  end with correct RTL handling for Arabic, but the translated string catalog
  covers core navigation/auth/commerce copy, not every microcopy string in the
  app - i18next falls back to English for anything not yet translated.
- **Outbound email** (password reset, notifications) is not wired to a
  provider; reset tokens are generated and stored for real, just not emailed
  (see `AuthService.forgotPassword`).
- **E2E tests**: Playwright is configured (`pnpm --filter @ptg/web test:e2e`)
  but only a starter smoke spec is included; expanding it to the full flows
  in section 44 of the brief is future work.
