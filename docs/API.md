# API

Base URL: `{API_URL}/api/v1`. Interactive OpenAPI docs are served at
`{API_URL}/docs` (NestJS Swagger, generated from the live controllers/DTOs -
treat this document as an index, not the source of truth).

Bare, unversioned probes for infra: `GET /health`, `/health/live`,
`/health/ready` (outside `/api/v1` on purpose - see `ObservabilityController`).

## Envelope

Every response is one of:

```jsonc
{ "success": true, "data": { /* ... */ }, "meta": { "requestId": "...", "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3, "hasNext": true, "hasPrevious": false } } }
```

```jsonc
{ "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "Only 2 of X are available.", "details": [{ "field": "quantity", "message": "..." }], "requestId": "...", "errorId": "..." } }
```

`code` is a stable, finite string from `packages/types/src/error-codes.ts`
(`ApiErrorCode`) - clients branch on it, never on `message`. `errorId` is only
present for unexpected 5xx failures and correlates the response with the
server log line.

## Auth

- `POST /auth/login` `{ memberId, password, rememberMe?, locale? }` → user +
  access token (refresh token set as an httpOnly cookie).
- `POST /auth/refresh` (cookie) → new access token, rotates the refresh
  token; reuse of an already-rotated refresh token revokes the whole session.
- `POST /auth/logout` `{ allSessions? }`
- `POST /auth/change-password`, `POST /auth/forgot-password`, `POST
  /auth/reset-password`
- `GET /auth/sessions`, `DELETE /auth/sessions/:id`
- `GET /me`

Send the access token as `Authorization: Bearer <token>`. Every request that
isn't `@Public()` requires it; permission-gated routes additionally require
the listed permissions (see `packages/types/src/rbac.ts`).

## Core resources

| Area | Endpoints |
| --- | --- |
| Profile | `GET/PATCH /profile`, `GET/POST /addresses`, `PATCH/DELETE /addresses/:id`, `POST /addresses/:id/default` |
| Dashboard | `GET /dashboard`, `GET /admin/dashboard` |
| Members | `GET /members`, `GET /members/:id`, `GET /members/report`, `GET /members/:id/report`, `GET /members/tree/sponsor`, `GET /members/tree/placement` |
| Wallet | `GET /wallets`, `GET /wallets/:type`, `GET /wallets/:type/transactions` |
| Points | `GET /points`, `GET /points/transactions` |
| Bonuses | `GET /bonuses`, `GET /bonuses/summary` |
| Catalog | `GET /categories`, `GET /products`, `GET /products/:slug` |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:id`, `DELETE /cart` |
| Checkout/Orders | `GET /checkout/quote`, `POST /orders`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` |
| Fulfillment | `GET /fulfillment-orders` |
| Health | `GET/PUT /health/profile`, `GET/POST /community/posts`, `GET/POST /community/posts/:id/comments`, `POST /community/posts/:id/reactions`, `POST /community/posts/:id/report`, `GET /sport/metrics`, `GET/POST /sport/scores`, `GET /sport/ranking`, `GET /health/articles`, `GET /health/articles/:slug` |
| Promotions/Investment | `GET /promotions`, `GET /investment-plans`, `GET/POST /investment-plans/enrollments`, `POST /investment-plans/:id/enroll` |
| Notifications | `GET /notifications`, `GET /notifications/counts`, `POST /notifications/:id/read`, `POST /notifications/read-all` |
| Settings/i18n | `GET /settings/public`, `GET /i18n/:locale` |
| Uploads | `POST /uploads/presign` |

## Admin resources (all additionally permission-gated - see `packages/types/src/rbac.ts`)

`/admin/users`, `/admin/members/:id/sponsor`, `/admin/members/:id/placement-parent`,
`/admin/categories`, `/admin/products`, `/admin/products/inventory/adjust`,
`/admin/orders`, `/admin/orders/:id`, `/admin/orders/:id/status`,
`/admin/orders/:id/shipment`, `/admin/orders/:id/refund`,
`/admin/wallets/:userId/:type/transactions`, `/admin/wallets/adjustments`,
`/admin/wallets/adjustments/:id/review`, `/admin/bonus-rules`,
`/admin/bonus-records`, `/admin/bonus-records/:id/status`,
`/admin/investment-plans`, `/admin/promotions`, `/admin/community/posts`,
`/admin/community/posts/:id/moderation`, `/admin/community/reports`,
`/admin/health/articles`, `/admin/localization/translations`,
`/admin/audit-logs`, `/admin/settings`.

## Idempotency

Every financially significant `POST` requires an `idempotencyKey` in the
request body (order creation, wallet adjustments, refunds, investment
contributions). Replaying the same key returns the original result instead
of creating a duplicate; generate one client-side with `crypto.randomUUID()`
per user action (see `newIdempotencyKey()` in both frontends' `api-client.ts`).

## Pagination, filtering, sorting

List endpoints accept `page`, `pageSize` (capped at `PAGINATION.maxPageSize`,
see `packages/config`), `sortBy`, `sortDir`, `from`/`to` (ISO date-time), and
resource-specific filters (`status`, `search`, ...). The response's
`meta.pagination` always carries the full page metadata shown above.
