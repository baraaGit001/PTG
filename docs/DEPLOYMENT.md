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

## The live server (Oracle Linux 9 / aarch64, rootless podman)

One VM runs the whole stack. `docker-compose.server.yml` describes it and
`deploy/server-update.sh` drives it; from Windows, `update-server.bat` is the
only thing that needs running.

```
update-server.bat            # pull origin/main onto the server, rebuild, restart
update-server.bat --push     # git push first, then the above
update-server.bat --seed     # ... and reseed the database
```

Each run does four things: pushes the branch (with `--push`), hard-resets the
server's checkout to `origin/main`, uploads `deploy/server.env` to the server
as its `.env`, and then rebuilds the images, applies migrations and restarts
the stack. The environment is uploaded *every* run, so `deploy/server.env` is
the single place to change production configuration - it is gitignored;
`deploy/server.env.example` is the committed template.

### Ports

| URL | Serves |
| --- | --- |
| `http://<ip>/` and `http://<ip>:3000/` | web app |
| `http://<ip>:4000/` | admin console |
| `http://<ip>/api/v1`, `/health`, `/docs` | API (from every port above) |

The admin console gets its own port rather than the `/admin/` prefix that
`docker-compose.prod.yml` uses. `apps/admin/vite.config.ts` sets no
`base: '/admin/'`, so the built `index.html` requests `/assets/*.js` from the
site root - which a path-prefixed mount hands to the *web* app. A separate
origin keeps both SPAs correct without a base-path change that would also have
to be threaded through the router. Port 3000 is kept alongside 80 because it
is the port already proven open end-to-end through the OCI security list.

### Why a separate compose file

`docker-compose.server.yml` is self-contained rather than an override layered
onto `docker-compose.yml` + `docker-compose.prod.yml`, because the server runs
`podman-compose`, whose multi-file merge is its own implementation rather than
docker compose's. It also differs from the prod file in ways the box forces:
images are fully qualified (podman has no implicit `docker.io`), and neither
the databases nor the API publish a host port - only the proxy is reachable,
and 3001 belongs to another project on that machine.

### One-time host setup

Already applied, recorded here because a rebuilt box needs it again:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp   # 3000, 4000 were already open
sudo firewall-cmd --reload
# rootless podman cannot bind :80 until the unprivileged range starts there
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/99-ptg-unprivileged-ports.conf
sudo sysctl --system
# containers are rootless, so they need lingering to survive logout/reboot
sudo loginctl enable-linger opc
```

`deploy/server-update.sh` enables `podman-restart.service` for the user on
every run, which is the other half of surviving a reboot.

Opening a port in `firewalld` is only half of it on OCI - the VCN security
list has to allow it too, and that is done in the Oracle Cloud console, not
on the box.

### TLS

Everything above is plain HTTP against a bare IP, which is why
`COOKIE_SECURE=false` and `COOKIE_DOMAIN=` (empty) in `deploy/server.env`: a
`Secure` cookie over HTTP is dropped silently, and a cookie whose `Domain` is
an IP address is rejected outright. Once a real domain and certificate exist,
set both properly in the same file and add the `listen 443 ssl` block to
`infra/nginx/server-proxy.conf`.

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
