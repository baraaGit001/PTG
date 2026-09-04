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
- `proxy` - `nginx:1.27-alpine` reverse-proxying `/api/*` and `/healthz*` to
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

### Ports, and why there are only two

The OCI VCN security list on this box allows **3000 and 4000** inbound and
drops everything else — port 80 times out rather than being refused, which is
the signature of the packet never reaching the host. Opening a port in
`firewalld` is only half of it; the other half is a console-side ingress rule
nobody has added. Two apps share the box, so they get one port each and
multiplex behind nginx:

| URL | Serves |
| --- | --- |
| `http://<ip>:3000/` | PTG web app |
| `http://<ip>:3000/admin/` | PTG admin console |
| `http://<ip>:3000/api/v1`, `/healthz`, `/docs`, `/media/` | PTG API |
| `http://<ip>:4000/` | AradoBot web app |
| `http://<ip>:4000/api/`, `/health` | AradoBot API |

The proxy also binds `:80`, so PTG moves to the bare IP the moment an 80
ingress rule is added — nothing else needs to change.

### The admin console's base path

Sharing one origin means the admin console lives under `/admin/`, and a
default Vite build cannot: its `index.html` asks for `/assets/*.js` at the
site *root*, which the proxy hands to the web app. So `apps/admin` takes an
`ADMIN_BASE_PATH` build arg (`/admin/` on the server, `/` everywhere else, so
`pnpm dev` still answers on `http://localhost:5174/`), and the router's
basename follows `import.meta.env.BASE_URL` rather than being hardcoded
somewhere it can drift from the build.

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

### Sharing the box with AradoBot

The VM also runs AradoBot (`~/aradobot`, deployed by its own
`deploy-oracle.bat`): a Next.js app and an Express API under **pm2**, with
MongoDB in podman, behind an nginx container that owns `:4000`. Both of its
processes bind loopback only. Nothing is shared with PTG except the host, so
the only real coupling is the port budget above and 2 vCPUs.

A third project, `pricelens`, is present but stopped, with
`podman update --restart=no` set on its containers so
`podman-restart.service` does not resurrect them. Its files and volumes are
intact.

### Troubleshooting: `EAI_AGAIN`, or containers cannot resolve each other

Rootless podman runs a single `aardvark-dns` for *all* of the user's networks,
driven by the files in
`/run/user/$UID/containers/networks/aardvark-dns/`. Each file names the
gateway address aardvark has to bind. If a network was recreated on a
different subnet, its old file survives, aardvark cannot bind an address that
no longer exists, and it **exits** — which takes DNS down for every network on
the box, not just the stale one. The symptom shows up far from the cause: a
build step failing with `getaddrinfo EAI_AGAIN`, or the API unable to resolve
`postgres`.

`deploy/server-update.sh` prunes entries for networks with no running
containers before it starts anything. To check by hand:

```bash
podman run --rm --network ptg_default alpine getent hosts postgres
```

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
