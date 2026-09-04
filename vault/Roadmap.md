# Roadmap / Status

## Implemented (per README "What's implemented")

- Auth with refresh-token rotation + RBAC
- Transactional wallet/points/bonus ledger
- Marketplace: server-authoritative cart + checkout
- Sponsor + placement network trees (materialized path)
- Health, community, sport-ranking, content features
- Admin console: users, catalog, orders, wallets, bonuses, promotions,
  investment plans, community moderation, localization, audit logs, settings

## Deliberately unfinished (not bugs — see README "Known limitations")

- [ ] Bonus calculation is manual/admin-driven, not automated (no invented formula) — [[Decisions/0002-bonus-calculation-not-automated]]
- [ ] Investment plans have no computed return/yield
- [ ] Promotion codes don't apply a real discount (checkout discount always 0)
- [ ] i18n: 5 locales wired (en, ar, ja, zh-CN, es; RTL works for ar), but
      translation coverage is partial — falls back to English
- [ ] Outbound email not wired to a provider (reset tokens generated, not sent)
- [ ] E2E: only a starter Playwright smoke spec exists

## Next up

*(empty — fill in as work is planned; move items here from a session note's
"Open questions / follow-ups" once they're actually decided)*

## How to use this file

Check a box (and note the session that did it, e.g. `— see [[Sessions/2026-09-04]]`)
when a limitation above gets addressed. Add rows under "Next up" as work gets
planned, so it's not sitting only in someone's memory of a chat.
