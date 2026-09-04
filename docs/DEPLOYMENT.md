# Deployment

## Production-shaped Docker Compose

```bash
cp .env.example .env   # fill in real secrets - never commit this file
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This builds and runs:

- `postgres`, `redis`, `minio` (+ `minio-init`, which creates the media bucket)
- `api` - `apps/api/Dockerfile`, multi-stage (pnpm install → prisma
  generate → build `@ptg/types`/`@ptg/config` → nest build → `node:22-alpine`
  runtime). The runtime stage keeps the workspace laid out under `/repo` and
  copies `packages/` alongside `node_modules`, because pnpm links
  `@ptg/config`/`@ptg/types` by relative symlink - flattening the tree breaks
  them. `openssl` is installed so Prisma picks its openssl-3 query engine.
- `web`, `admin` - multi-stage Vite build served by `nginx:1.27-alpine`
  (`infra/nginx/spa.conf`: SPA fallback to `index.html`, long-cache hashed
  assets, gzip)
- `proxy` - `nginx:1.27-alpine` reverse-proxying `/api/*` and `/health*` to
  the API, `/admin/*` to the admin app, everything else to the web app
  (`infra/nginx/reverse-proxy.conf`)

Run database migrations against the containerized Postgres before or
alongside first boot:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api \
  node -e "require('child_process').execSync('npx prisma migrate deploy', {stdio:'inherit'})"
```

(or run `pnpm --filter @ptg/api db:migrate:deploy` from a machine with
`DATABASE_URL` pointed at the production database).

## TLS

Terminate TLS upstream of `proxy` (a managed load balancer, or add a
`listen 443 ssl` server block with real certificates to
`infra/nginx/reverse-proxy.conf`) and set `COOKIE_SECURE=true`,
`CORS_ORIGINS` to the real HTTPS origins.

## Environment

See `.env.example` for the full variable list. At minimum for production:

- `DATABASE_URL`, `REDIS_URL` pointed at managed services (not the bundled
  containers).
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` - freshly generated,
  32+ random bytes each, never reused from `.env.example` or a lower
  environment.
- `S3_*` pointed at a real S3-compatible bucket (AWS S3, R2, ...) instead of
  the bundled MinIO.
- `CORS_ORIGINS` limited to the exact production origins of the web and
  admin apps.
- `DEMO_MODE=false` - the frontends visibly badge data as demo when this is
  true.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR to `main`: spins up
Postgres+Redis service containers, installs the workspace, generates the
Prisma client, lints, typechecks, applies migrations against the test
database, runs the test suite, and builds every app/package. Wire a deploy
job after it (e.g. `docker build` + push + a rolling deploy to your
platform of choice) once you have a target environment - deliberately left
open since it is infrastructure-specific.

## Scaling notes

- The API is stateless (sessions/rate-limit counters live in Redis, not
  process memory) - safe to run multiple replicas behind the proxy.
- `WalletLedgerService`/`PointsService`/`InventoryService` use Postgres
  Serializable transactions with bounded retry for correctness under
  concurrent writers - no in-process locking is relied on, so this is safe
  across replicas.
- BullMQ (`bullmq` dependency, Redis-backed) is wired as a dependency for
  future background workers (ranking aggregation, points expiry, order
  timeout - see `packages/config`'s `QUEUES`); no worker process ships yet,
  so nothing needs a separate worker deployment today.
