# Architecture

Condensed map of the system. Full detail lives in
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — this page is an index, not
a replacement.

## Shape

- Monorepo (pnpm workspaces): `apps/{web,admin,api}`, `packages/{ui,types,config,eslint-config,tsconfig}`
- `apps/api` — NestJS + Prisma + PostgreSQL, one REST API for both frontends
- `apps/web` — partner + marketplace React app (Vite), `:5173`
- `apps/admin` — back-office React app (Vite), `:5174`
- Postgres is the single source of truth for money and points — see
  [[Decisions/0001-ledger-as-source-of-truth]]

## Where to look for what

| Question | Doc |
|---|---|
| Module boundaries, ledger discipline, sponsor trees, state machines | [ARCHITECTURE.md](../docs/ARCHITECTURE.md) |
| Endpoint shapes, envelope, auth, idempotency, pagination | [API.md](../docs/API.md) |
| Schema, model groups, indexing, migrations | [DATABASE.md](../docs/DATABASE.md) |
| AuthN/AuthZ, input validation, secrets, known security gaps | [SECURITY.md](../docs/SECURITY.md) |
| Docker Compose, TLS, env, CI/CD, scaling | [DEPLOYMENT.md](../docs/DEPLOYMENT.md) |
| Workspace scripts, migration workflow, testing, code style | [DEVELOPMENT.md](../docs/DEVELOPMENT.md) |

## Domain areas

Wallet/points/bonus ledger · marketplace (cart, checkout) · sponsor/placement
network trees · health/community/sport-ranking · admin console (users,
catalog, orders, wallets, bonuses, promotions, investment plans, moderation,
localization, audit, settings).

See [[Glossary]] for the vocabulary and [[Roadmap]] for what's deliberately
not implemented yet.
