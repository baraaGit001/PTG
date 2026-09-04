# 0008 — The live site is one VM, rootless podman, and one batch file

Date: 2026-09-04

> Amended the same day, before anything was serving traffic: the first draft
> gave the admin console its own port (4000). Then the OCI security list turned
> out to allow only 3000 and 4000 inbound, and AradoBot was deployed to the
> same box and needed one of them. The "Ports" section below is the layout that
> shipped.

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
- PTG serves **everything from one origin, `:3000`** — web at `/`, admin
  console at `/admin/`, API at `/api/`, plus `/health`, `/docs` and `/media/`.
  AradoBot gets `:4000` for the same reason. Nothing else publishes a host
  port. The proxy also binds `:80` so PTG moves to the bare IP for free if an
  80 ingress rule is ever added.
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

**Two ports, so PTG multiplexes.** Opening a port in `firewalld` is only half
of it on OCI; the VCN security list has to allow it too, and that is done in
the Oracle Cloud console rather than on the box. Measured rather than assumed:
`:3000` answers, `:4000` refuses the connection (so the packet reaches the
host), and `:80` *times out* — the signature of a packet dropped before it
ever arrives. Three frontends and two APIs across two ports means one port has
to carry two frontends, and PTG is the app with two.

**So the admin console had to learn a base path.** `apps/admin` built with the
default base asks for `/assets/*.js` at the site *root*; behind `/admin/`,
nginx strips the prefix and those requests land on the **web** app — a blank
console. This was already broken in `docker-compose.prod.yml`'s `/admin/`
mount, just never exercised. `apps/admin` now takes an `ADMIN_BASE_PATH` build
arg, defaulting to `/` so `pnpm dev` is untouched, and the router's basename
follows `import.meta.env.BASE_URL` so the two cannot drift apart.

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
