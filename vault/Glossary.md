# Glossary

Domain terms used across code, docs, and this vault. Add to this as new
vocabulary comes up instead of re-explaining it in every session note.

- **Ledger** — the Postgres-backed, transactional record of wallet balances,
  points, and inventory; the single source of truth for money. See
  [[Decisions/0001-ledger-as-source-of-truth]].
- **Partner** — an authenticated member of the marketplace/network side of
  the platform (as opposed to a guest or plain customer).
- **Sponsor tree / placement tree** — the two network-tree structures
  partners sit in, built on a materialized-path schema
  (`docs/ARCHITECTURE.md` § "Sponsor / placement trees").
- **Bonus / BonusRecord** — a ledger entry crediting a partner, created via
  explicit admin action — not computed by an inferred formula. See
  [[Decisions/0002-bonus-calculation-not-automated]].
- **Investment plan** — descriptive configuration only; no yield/return is
  computed anywhere in the codebase.
- **Promotion** — a marketing banner (per the brief's IA), not a redeemable
  discount coupon; checkout `discount` is always zero until a real
  discount-code rule is supplied.
- **Envelope** — the standard API response wrapper shape
  (`docs/API.md` § "Envelope").
- **RBAC** — role-based access control; roles/permissions defined in
  `packages/types/src/rbac.ts`.
