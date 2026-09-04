# Architecture

## System overview

```
                         ┌─────────────────────┐
                         │   packages/types     │  DTOs, enums, error codes,
                         │   packages/config     │  state machines, nav map,
                         │   packages/ui         │  shared component library
                         └──────────┬────────────┘
                                    │ workspace deps
                ┌───────────────────┼───────────────────┐
                │                   │                    │
        ┌───────▼──────┐   ┌────────▼───────┐   ┌────────▼───────┐
        │  apps/web     │   │  apps/admin    │   │  apps/api      │
        │  React+Vite    │   │  React+Vite    │   │  NestJS         │
        │  :5173         │   │  :5174         │   │  :3001          │
        └───────┬────────┘   └────────┬───────┘   └────────┬────────┘
                │  fetch, credentials: 'include' (cookies)   │
                └───────────────────────┬─────────────────────┘
                                         │ /api/v1/*
                                ┌────────▼────────┐
                                │  PostgreSQL      │  Prisma schema, source of
                                │  Redis           │  truth for every ledger
                                │  S3 (MinIO/prod) │  RBAC cache, sessions,
                                └──────────────────┘  translations, product media
```

Both frontends are separate Vite SPAs that talk to the same versioned REST
API (`/api/v1`) over `fetch`, never to the database directly. They share
`@ptg/ui` (components), `@ptg/types` (DTOs/enums, kept in lockstep with the
Prisma schema and the NestJS controllers) and `@ptg/config` (navigation map,
cross-cutting constants) so the three apps cannot silently drift apart.

## Backend module boundaries

`apps/api/src/modules/*` - one NestJS module per bounded context. Modules
depend on each other's exported services (never reach into another module's
Prisma calls or DTOs directly):

- **auth** - login/refresh/logout, Argon2id hashing, refresh-token rotation
  with reuse detection, session management, password reset.
- **rbac** - resolves a user's live roles/permissions (short Redis-cached),
  read by `PermissionsGuard`. Never trusts the JWT payload for authorization.
- **users** / **members** - profile, addresses, admin user management;
  sponsor/placement network trees (materialized-path schema, see below).
- **wallet** - `WalletLedgerService` (E_ACCOUNT/BONUS_POOL), `PointsService`
  (PERSONAL_POINTS), `BonusService`, `AdjustmentsService`. The only code in
  the system allowed to change a balance.
- **catalog** / **cart** / **orders** - product catalog, inventory ledger,
  server-authoritative cart, checkout, the order/payment/shipment state
  machines, refunds.
- **health**, **community**, **sport**, **content** - health profile,
  moderated community feed, sport ranking, health-knowledge articles.
- **promotions**, **investment** - marketing banners and descriptive
  investment-plan configuration (see "Deliberately not implemented" below).
- **notifications**, **dashboard**, **settings**, **localization**, **audit**,
  **uploads** - cross-cutting platform services.

Cross-cutting concerns (`apps/api/src/common/*`) are wired once in
`app.module.ts`: `JwtAuthGuard` → `PermissionsGuard` → `ThrottlerGuard` run on
every request; `AllExceptionsFilter` normalizes every error into the
`{ success:false, error:{ code, message } }` envelope; `ResponseInterceptor`
wraps every success into `{ success:true, data, meta }`.

## Ledger discipline (wallet, points, inventory)

Every balance-affecting operation follows the same shape, implemented once
per ledger (`WalletLedgerService.postTransaction`, `PointsService.post`,
`InventoryService`'s reserve/release/fulfill/adjust):

1. Validate the request and resolve the actor's authorization.
2. If an `idempotencyKey` was already used, return the original result -
   never post twice.
3. Read the current balance and the new balance inside a **Serializable**
   database transaction (`Prisma.TransactionIsolationLevel.Serializable`),
   retried a bounded number of times on a serialization conflict.
4. Reject the mutation if it would take a non-negative balance below zero.
5. Write the new cached balance and the immutable ledger row in the same
   transaction.
6. Write an `AuditLog` row for admin-initiated mutations.

The cached balance on `Wallet`/`Inventory` is *only ever* written inside the
same transaction as the ledger row that explains it - there is no code path
that updates a balance without a corresponding `WalletTransaction` /
`PointTransaction` / `InventoryTransaction`.

## Sponsor / placement trees

`SponsorRelationship` and `PlacementRelationship` are two independent tables,
each using an adjacency pointer (`sponsorId` / `placementParentId`) *plus* a
materialized path (`path`, `depth`). A member's descendants are one indexed
prefix query (`path LIKE '<ancestorPath><ancestorId>.%'`) instead of a
recursive N+1 walk. Reads return a bounded subtree (`TREE.maxDepth`,
`TREE.maxTraversalNodes` in `packages/config`); the frontend re-queries with a
boundary node as the new root to lazily expand deeper levels. See
`apps/api/src/modules/members/path.util.ts` and `tree.util.ts`.

Reassigning a member's parent (admin-only) rewrites that member's own path
and every descendant's path/depth inside one transaction, after a
circular-relationship check (`isWithinSubtree`).

## State machines

Order, payment, shipment, bonus-record and promotion lifecycles are defined
once, as data, in `packages/types/src/state-machines.ts`
(`ORDER_TRANSITIONS`, `PAYMENT_TRANSITIONS`, ...) and enforced with
`canTransition()` everywhere a status changes - both backend services (which
reject an invalid transition with `INVALID_ORDER_TRANSITION` etc.) and the
frontend (which only offers the `allowedTransitions` the API returns).

## Deliberately not implemented (see the brief's own constraints)

- **Bonus formulas**: `BonusRule.configuration` is admin-authored JSON; no
  payout amount is computed by an invented formula. `BonusRecord`s enter a
  traceable PENDING → APPROVED → PAID lifecycle via an explicit admin action.
  A real calculator, when the business rule is supplied, belongs in its own
  reviewed service that still ends by calling `BonusService.createRecord`.
- **Investment returns**: `InvestmentPlan`/`InvestmentPerformanceSnapshot`
  store only what an admin enters. No yield/ROI is calculated.
- **Discount codes**: `Promotion` models the marketing-banner concept from
  the brief's IA (region, date range, image, rules JSON), not a coupon engine
  - there is no code that reduces `Cart.totals.discount`.

## Frontend architecture

Both `apps/web` and `apps/admin` follow the same feature-based layout:

```
src/
  features/<domain>/api.ts        TanStack Query hooks (server state)
  features/<domain>/*-page.tsx    Route components
  stores/auth.store.ts            Zustand - the only *client*-global state
  lib/api-client.ts               fetch wrapper: envelope parsing, silent
                                   refresh-and-retry on 401, idempotency keys
  routes/router.tsx               React Router route table (code-split)
```

Server state never lives in Zustand; Zustand holds only the authenticated
user and the in-memory access token. The refresh token never reaches
JavaScript (httpOnly, `SameSite=Strict` cookie scoped to `/api/v1/auth`).
