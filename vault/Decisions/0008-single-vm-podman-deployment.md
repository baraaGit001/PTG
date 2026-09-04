# 0008 — The live site is one VM, rootless podman, and one batch file

Date: 2026-09-04

## Context

The site needed to go up on an existing Oracle Cloud box (Oracle Linux 9.8,
aarch64, 2 vCPU, 10.9 GB RAM) and to be updatable from Windows afterwards
without anyone remembering a sequence of SSH commands.

The box was not empty. It already ran another project, `pricelens`, under
**rootless podman** on ports 3000 and 3001, with `docker` on `$PATH` only as
podman's CLI emulation and `docker compose` shelling out to `podman-compose`.
There is no TLS, no domain — the site is reached at `http://130.110.124.121`.

`docker-compose.prod.yml` did not fit that box as written.

## Decision

- A separate, **self-contained** `docker-compose.server.yml`, not an override
  layered onto `docker-compose.yml` + `docker-compose.prod.yml`.
- The **admin console gets its own port (4000)** instead of the `/admin/`
  path prefix the prod compose file uses.
- The web app answers on **:80 and :3000**; the API, `/health`, `/docs` and
  `/media/` answer from every port. Nothing else publishes a host port.
- `update-server.bat` is the only entry point, and it **uploads
  `deploy/server.env` to the server as its `.env` on every run**.

## Why

**Self-contained compose file.** `podman-compose` is a separate Python
implementation, not docker compose — including its multi-file merge. A single
file that says exactly what runs is one less thing to debug over SSH. It also
has to differ from the prod file in ways the box forces: images fully
qualified (podman has no implicit `docker.io`), no host port for the API
(3001 belongs to `pricelens`), and no host ports for postgres/redis/minio at
all, so only the proxy is exposed.

**Admin on its own port.** `apps/admin/vite.config.ts` sets no
`base: '/admin/'`, so the built `index.html` asks for `/assets/*.js` at the
site *root*. Behind a path-prefixed mount, nginx strips `/admin/` and those
asset requests land on the **web** app instead — a blank admin console. The
alternatives were to set a base path and thread a matching router basename
through the admin app, or to give admin its own origin. The second is a
deployment-level choice that touches no application code and cannot regress
local dev, so it won. If admin ever needs to live under `/admin/`, the base
path is the thing to fix first.

**Port 3000 alongside 80.** Opening a port in `firewalld` is only half of it
on OCI; the VCN security list has to allow it too, and that is done in the
Oracle Cloud console rather than on the box. 3000 was already proven open
end-to-end (it was serving `pricelens`), so keeping it means the site works
regardless of what the security list says about 80.

**Rootless, not root.** Matching how the box already runs. The cost is that
binding :80 needs `net.ipv4.ip_unprivileged_port_start=80`, and surviving a
reboot needs `loginctl enable-linger opc` plus the user's
`podman-restart.service` — all recorded in
[DEPLOYMENT.md](../../docs/DEPLOYMENT.md).

**Env uploaded every run.** The alternative is an `.env` edited in place on
the server, which drifts invisibly and is lost with the box. Uploading makes
`deploy/server.env` the single source for production config. It stays
gitignored — `deploy/server.env.example` is the committed template.

## Status

Accepted.
