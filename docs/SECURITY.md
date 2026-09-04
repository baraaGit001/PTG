# Security

## Authentication

- Passwords hashed with **Argon2id** (`argon2` package,
  `apps/api/src/modules/auth/password.service.ts`), never stored or logged
  in plaintext.
- **Access tokens**: short-lived JWTs (default 15 min,
  `JWT_ACCESS_TTL`), signed with `JWT_SECRET`, carry only `{ sub, sid }` -
  roles/permissions are *never* trusted from the token; every request
  resolves them fresh from the database (short Redis-cached) via
  `RbacService`, so a role change or account suspension takes effect within
  seconds, not at next login.
- **Refresh tokens**: opaque, stored server-side only as an Argon2 hash
  (`RefreshToken.tokenHash`); the raw token is delivered to the *web/admin*
  clients as an httpOnly, `SameSite=Strict`, path-scoped
  (`/api/v1/auth`) cookie - it never reaches JavaScript. Every refresh
  **rotates** the token; presenting an already-rotated token is treated as
  reuse (compromise) and revokes the entire session (`REFRESH_TOKEN_REUSED`).
- **Session management**: `GET /auth/sessions` / `DELETE
  /auth/sessions/:id`; `POST /auth/logout { allSessions: true }` revokes
  every session for the user.
- **Account lockout**: `User.failedLoginAttempts` / `lockedUntil`, tunable
  via `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCK_MINUTES`.
- **Rate limiting**: global `@nestjs/throttler` guard plus a tighter
  per-route `@Throttle` on `/auth/login`, `/auth/forgot-password`,
  `/auth/reset-password`.
- **Password reset**: enumeration-safe (`forgotPassword` always returns the
  same response whether or not the member ID exists); the reset token is a
  random secret whose hash is stored, single-use (`usedAt`), 1-hour expiry.

## Authorization (RBAC)

Roles and a granular permission catalogue live in
`packages/types/src/rbac.ts` and are enforced **only** server-side:
`JwtAuthGuard` resolves the caller, `PermissionsGuard` checks the
`@RequirePermissions(...)` metadata on the route against the caller's live
permission set. The frontends hide UI for permissions the user lacks purely
for UX - every mutation is re-checked by the API regardless of what the
client sends or hides.

## Input validation & output handling

- Every request DTO is validated with `class-validator` +
  `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform:
  true })` - unknown fields are rejected, not silently dropped.
- Money, quantities and other numeric business inputs are validated as
  integers server-side (see `common/money.util.ts`); the client-submitted
  price is **never** trusted - checkout always recomputes totals from the
  database (`OrdersService.createOrder`).
- Health-article/community body HTML is admin-authored through the CMS
  flow, not accepted as arbitrary user HTML on public-facing forms; the one
  `dangerouslySetInnerHTML` call in the frontend (article body) renders only
  that admin-authored content.

## Secrets

- `.env` is git-ignored; `.env.example` documents every variable with no
  real values. `JWT_SECRET` / `JWT_REFRESH_SECRET` / `COOKIE_SECRET` are
  validated to be present and long enough at boot (`env.validation.ts`) -
  the process refuses to start otherwise.
- No secret is ever sent to a frontend bundle: `VITE_*` variables are the
  only env vars exposed to the browser, and none of them are secrets (API
  URL, brand name/logo only).

## Transport & headers

- `helmet()` (CSP, standard security headers) on every response.
- CORS is an explicit allowlist (`CORS_ORIGINS`), not `*`, and
  `credentials: true` so the refresh cookie only round-trips to
  allow-listed origins.
- Cookies are `Secure` in production (`COOKIE_SECURE=true`), `SameSite=Strict`.

## File uploads

`POST /uploads/presign` validates MIME type against an allowlist
(`UPLOAD.allowedImageMimeTypes`) and a size cap
(`UPLOAD.maxFileSizeBytes`) *before* issuing a short-lived (5 min) presigned
S3 `PutObject` URL - the API process never buffers the file itself, and the
browser never gets standing write access to the bucket.

## Auditing

Every sensitive mutation writes an `AuditLog` row (actor, role, action,
entity, before/after, IP, user agent) in the same transaction as the
mutation it describes - see `AUDIT_ACTIONS` in `packages/config` for the
full, closed list, which includes: login success/failure, logout, refresh
token reuse, password changes, role/status changes, wallet
adjustments/reversals, bonus rule/record changes, product price changes,
inventory adjustments, order status changes and refunds, content moderation,
promotion/setting/translation updates. `GET /admin/audit-logs` exposes the
trail (permission `audit.read`).

## SQL injection / ORM discipline

All database access goes through Prisma's typed query builder; the one raw
query in the codebase (`SELECT 1` in the readiness probe) takes no
interpolated input. There is no string-concatenated SQL anywhere in the
application.

## Known gaps (be explicit about what is not yet hardened)

- CSRF: cookie is `SameSite=Strict`, which is the primary mitigation for a
  cookie-authenticated cross-site request; a dedicated CSRF token has not
  been added on top of it. Acceptable for the current same-site cookie
  scope, worth revisiting if a third-party origin ever needs the cookie.
- No WAF/DDoS layer is included (out of scope for an application-level
  codebase) - expected to sit in front of this stack in production (see
  DEPLOYMENT.md).
