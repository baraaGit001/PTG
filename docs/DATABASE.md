# Database

PostgreSQL via Prisma. Full schema: `apps/api/prisma/schema.prisma`. This
document summarizes the model groups and the non-obvious design decisions;
read the schema's own doc-comments for field-level detail.

## Conventions

- **IDs**: UUID (`@default(uuid())`) on every model.
- **Money**: `BigInt` minor-unit columns (`amountMinor`) + a `currency`
  string column, never `Decimal`/`Float`. See `packages/types/src/money.ts`
  and `apps/api/src/common/money.util.ts` for the only conversion points.
- **Timestamps**: `createdAt`/`updatedAt` on every mutable model.
- **Soft deletion**: avoided by default. Rows that participate in financial
  or order history are never hard-deleted; a status column (`ARCHIVED`,
  `CANCELLED`, `CLOSED`, ...) represents the terminal state instead, so
  ledgers, audit logs and order history never lose their referents. Plain
  reference data (categories, translations) *is* hard-deleted, guarded by
  foreign-key/child checks (e.g. `CATEGORY_HAS_CHILDREN`).

## Model groups

**Auth/RBAC** - `User`, `Role`, `Permission`, `RolePermission`, `UserRole`
(many-to-many), `Session`, `RefreshToken` (rotation chain via
`replacedByTokenId`), `PasswordResetToken`.

**Members/network** - `PartnerProfile`, `Address`, and the two independent
tree tables `SponsorRelationship` / `PlacementRelationship`, each an
adjacency pointer plus a materialized `path`/`depth` (see ARCHITECTURE.md).

**Wallet/ledger** - `Wallet` (cached balance, one row per user per
`WalletType`), `WalletTransaction` (immutable ledger, unique
`idempotencyKey`, self-referential `reversalOfId` so a transaction can be
reversed at most once), `WalletAdjustmentRequest` (admin adjustment
workflow), `PointTransaction` (the Personal Points ledger - a `Wallet(type=
PERSONAL_POINTS)` row mirrors its running balance purely as a read cache),
`BonusRule`, `BonusRecord`.

**Catalog** - `Category` (self-referential tree), `Product`,
`ProductImage`, `ProductAttribute`, `ProductVariant`, `Inventory` (one row
per variant: `onHand`, `reserved`), `InventoryTransaction` (immutable ledger
mirroring the wallet ledger's discipline).

**Cart/orders** - `Cart`/`CartItem` (server-authoritative; `addedPriceMinor`
is a drift-detection snapshot, never used for totals), `Order`/`OrderItem`
(order line items snapshot product/variant name+price at purchase time),
`Payment`/`PaymentTransaction`, `Shipment`, `OrderTimelineEntry`.

**Promotions/Investment** - `Promotion` (marketing banner, region array,
free-form `rules` JSON), `InvestmentPlan`, `InvestmentEnrollment`,
`InvestmentTransaction`, `InvestmentPerformanceSnapshot` (admin-entered data
points only - no computed column anywhere in this group).

**Health** - `HealthProfile`, `CommunityPost`/`CommunityComment`/
`CommunityReaction`/`CommunityReport`, `SportMetric`/`SportScore`/
`SportRanking` (the last is a pre-aggregation cache table for a future
BullMQ ranking worker; today the ranking endpoint computes live from
`SportScore` and is safe either way), `HealthArticleCategory`/`HealthArticle`.

**Platform** - `Notification`, `AuditLog` (indexed on `entityType+entityId`,
`actorId`, `action`, `createdAt`), `SystemSetting` (key/JSON value,
`isPublic` flag gates exposure via `GET /settings/public`), `Translation`
(`locale`+`namespace`+`key` unique).

## Indexing

Every foreign key has a matching index; list/report queries that filter by a
non-PK column (`Order.status`, `Order.placedAt`, `BonusRecord.status`,
`WalletTransaction.walletId+createdAt`, `Notification.userId+readAt`, the
tree tables' `path`, ...) have a dedicated `@@index`. Composite uniqueness
(`Wallet.userId+type`, `CartItem.cartId+variantId`,
`SportScore.userId+metricId+recordedFor`,
`Translation.locale+namespace+key`) is enforced at the database level, not
just in application code.

## Migrations

```bash
pnpm db:migrate          # dev: creates + applies a migration, regenerates the client
pnpm db:migrate:deploy    # CI/prod: applies pending migrations, no prompts
pnpm db:reset             # drops, recreates, migrates and reseeds (destructive, dev only)
```
