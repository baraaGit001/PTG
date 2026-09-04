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
| `pnpm dev` | frees the dev ports, then api + web + admin, watch mode, in parallel |
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
- **API structural guards**: two specs scan `apps/api/src` for runtime traps
  the compiler cannot see. `runtime-imports.spec.ts` enforces ADR 0004 (a
  `import type`'d DTO becomes `Function` in `design:paramtypes`).
  `prisma-query-shape.spec.ts` catches `select` and `include` on the same
  Prisma argument object — Prisma rejects that pair at runtime, so it compiles
  and then 500s on every request. Both fail with the offending
  `file:line`, and both include a test proving the scanner still detects the
  shape it guards.
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

## Troubleshooting the dev servers

### Blank page, `Failed to load module script ... MIME type of ""`

Symptom: the Vite page loads (the tab title is right) but `#root` stays
empty, and the console fills with

```
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "".
```

In dev, Vite serves each source file at its own URL, so a module is fetched
from e.g. `/src/lib/api-client.ts`. If a download manager or security tool
on the machine claims URLs ending in `.ts` — the extension is also the one
for MPEG transport streams — it intercepts the request inside the browser,
never forwards it, and hands the page back an empty `204 No Content`. With
no `Content-Type`, the browser refuses it as a module and the app never
boots. `.tsx` files are unaffected, which is why the page partly loads.

Confirming it is the machine and not the code:

```bash
curl -i http://localhost:5173/src/lib/api-client.ts   # 200 text/javascript
```

If curl gets a normal `200` for the same URL the browser 204s, nothing is
wrong with Vite — the request is being taken before it leaves the browser.
Adding any query string (`?x=1`) also makes it succeed, since the
interception matches on the URL's trailing extension.

**Internet Download Manager is the culprit on Windows**, and specifically its
**`IDMWFP` filter driver** (`idmwfp.sys`, a Windows Filtering Platform
driver) — not the browser extension. `.ts` is also the extension for MPEG
transport streams, so IDM claims it.

Because the interception is in a kernel driver:

- every Chromium-based browser is affected, including a fresh profile with
  no extensions at all;
- killing `IDMan.exe` does **not** stop it — the driver stays loaded;
- removing `TS` from `HKCU\Software\DownloadManager\Extensions` does not
  stop it either, even after reloading the driver. The driver does not read
  its list from that value.

What actually works is stopping the driver (elevated):

```powershell
sc.exe stop IDMWFP              # takes effect immediately
sc.exe config IDMWFP start= demand   # and does not come back at boot
```

Revert with `sc.exe config IDMWFP start= auto`, then reboot.

The only thing lost is IDM's "advanced browser integration" — the driver
hook that grabs downloads without the extension. IDM itself keeps working,
and its browser extension keeps grabbing downloads normally.

Changing it from IDM's own window (*Options → File Types*, remove `TS`) may
also work and is more surgical, but it was not the path verified here.

Nothing in this repo can work around it — the request never reaches the dev
server.

### Ports

Both Vite configs set `strictPort: true`. A second `pnpm dev` therefore
fails with "Port 5173 is already in use" instead of quietly starting on
5174/5175/5176. That matters: two dev servers for the *same* app share
`apps/<app>/node_modules/.vite/deps` and overwrite each other's optimised
bundles, which produces its own crop of modules that fail to load. And
because `pnpm -r --parallel` fails fast, one stuck port took down all three
apps.

`pnpm dev` now runs [`scripts/free-dev-ports.mjs`](../scripts/free-dev-ports.mjs)
first, so reclaiming the port is no longer a manual step:

```
pnpm dev                                # frees 3001/5173/5174, then starts all three
pnpm dev:web                            # frees 5173 only
node scripts/free-dev-ports.mjs 5199    # any port — handy for testing the script
```

Ports come from `.env` (`API_PORT`, `APP_URL`, `ADMIN_URL`), so changing them
there is enough. The script is deliberately narrow: it kills a listener only
when the process image is `node`, because the orphan it exists to clear is
always one of ours. Anything else — Docker, another server, an IDE — is named
and the script exits non-zero instead:

```
[dev] web port 5173 is held by python3.13.exe (pid 2916). Not killing that - stop it yourself and re-run.
```

The trade-off: `pnpm dev` now takes the ports rather than asking. If a stack
is deliberately running and you start a second `pnpm dev`, the first one dies
instead of the second one refusing to start.
