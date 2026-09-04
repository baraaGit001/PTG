# Development

## First-time setup

```bash
pnpm install
cp .env.example .env
# edit .env: JWT_SECRET / JWT_REFRESH_SECRET / COOKIE_SECRET must each be
# 32+ random characters - `openssl rand -base64 32` twice, plus one shorter
# one for COOKIE_SECRET.

pnpm docker:up            # postgres :5432, redis :6379, minio :9000/:9001
pnpm db:migrate            # apply the schema
pnpm db:seed               # obviously-fake demo data
pnpm dev                   # api :3001, web :5173, admin :5174
```

## Workspace scripts (root `package.json`)

Every script fans out to the relevant workspace package via `pnpm -r` or
`pnpm --filter`. Run `pnpm <script>` from the repo root; running inside an
individual `apps/*` package works too (its own `package.json` has the same
script names without the `db:*` ones, which live only in `apps/api`).

| Script | What it does |
| --- | --- |
| `pnpm dev` | api + web + admin, watch mode, in parallel |
| `pnpm build` | builds every package/app (types → config/ui → api/web/admin) |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm lint` | ESLint (flat config, `@ptg/eslint-config`) in every package |
| `pnpm test` | unit/integration tests (Jest for the API, Vitest for the frontends) |
| `pnpm db:migrate` | create + apply a dev migration, regenerate the Prisma client |
| `pnpm db:seed` | re-run `apps/api/prisma/seed.ts` |
| `pnpm db:reset` | drop, recreate, migrate, reseed (destructive) |

## Adding a Prisma migration

1. Edit `apps/api/prisma/schema.prisma`.
2. `pnpm db:migrate` - prompts for a migration name, applies it locally,
   regenerates `@prisma/client`.
3. Update the corresponding DTO in `packages/types/src/dto/*.ts` and the
   service/controller in `apps/api/src/modules/*` in the same change - the
   Prisma schema, the shared types, and the API surface are meant to move
   together.
4. Commit the generated `apps/api/prisma/migrations/<timestamp>_<name>/`
   directory.

## Adding a feature end-to-end (the intended order)

Mirrors the brief's phased plan: schema → API contract → shared types →
backend service/controller → frontend `api.ts` hook → frontend page. Don't
start the page before the DTO exists in `@ptg/types` - both frontends import
request/response shapes from there, so the contract is fixed before any UI
code is written against it.

## Testing

- **API**: Jest (`apps/api/jest.config.cjs`). `test/*.spec.ts` covers
  dependency-free logic today (money arithmetic, state machines, the
  materialized-path tree helpers, password policy, and the wallet ledger's
  idempotency/negative-balance/reversal invariants against an in-memory
  Prisma double). Extending this to full Postgres-backed integration tests
  (spin up the `docker-compose.yml` Postgres, run migrations, exercise a
  real `WalletLedgerService` through Nest's testing module) is the natural
  next step and the harness (`@nestjs/testing`, `supertest`) is already a
  dev dependency.
- **Web**: Vitest + Testing Library (`apps/web/vitest.config.ts`). Run
  `pnpm --filter @ptg/web test`.
- **Web E2E**: Playwright (`apps/web/playwright.config.ts`,
  `apps/web/e2e/*.spec.ts`). Requires the API + a seeded database running
  against the same `VITE_API_URL` the app was built/previewed with:
  ```bash
  pnpm docker:up && pnpm db:migrate && pnpm db:seed
  pnpm --filter @ptg/api build && pnpm --filter @ptg/api start &
  pnpm --filter @ptg/web test:e2e
  ```

## Code style

- `@ptg/eslint-config` (flat config) is shared by every package;
  `no-explicit-any`, `no-unused-vars`, `consistent-type-imports` are errors,
  not warnings.
- Prettier (`.prettierrc` at the repo root) formats everything; no
  per-package overrides.
- Feature folders own their own `api.ts` (TanStack Query hooks) - a page
  component never calls `fetch`/`apiRequest` directly.

## Working with the two frontends

`apps/web` and `apps/admin` are intentionally separate Vite apps (not a
single app with route-based role switching) so a customer/partner bundle
never ships admin code, and vice versa. They duplicate a small amount of
plumbing (`lib/api-client.ts`, `stores/auth.store.ts`, `components/`) by
design - everything *shared* (types, UI components, navigation map,
constants) lives in `packages/*` instead of being copy-pasted.
