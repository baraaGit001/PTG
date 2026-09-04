# PTG Business — Project Vault

Start here. This vault is project *memory*: decisions, status, and session
history that isn't already captured in code or in [docs/](../docs). Check
[[Sessions/README|Sessions]] before touching a part of the codebase you
didn't just write — it's faster than re-reading old chat transcripts.

## Map

- [[Architecture]] — system shape, index into the engineering docs
- [[Roadmap]] — what's done, what's deliberately unfinished, what's next
- [[Glossary]] — domain vocabulary (ledger, sponsor tree, bonus, etc.)
- [[Decisions/README|Decisions]] — ADRs: why things are the way they are
- [[Sessions/README|Sessions]] — dated log of what happened each work session

## Engineering docs (outside this vault)

The authoritative technical reference lives in [docs/](../docs): ARCHITECTURE.md,
API.md, DATABASE.md, SECURITY.md, DEPLOYMENT.md, DEVELOPMENT.md. This vault
links to them rather than duplicating them — update `docs/` for *how* the
system works, update this vault for *why* decisions were made and *what*
happened session to session.

## Recent sessions

- [[Sessions/2026-09-04-5]] — the Community 400 (ADR 0004's type-only
  import trap, twice) and the Health tab that never reached the Health
  screen; Health Management rebuilt to the app's layout
- [[Sessions/2026-09-04-4]] — matching the real PTG Business app: Demo badge
  gone, ZAR everywhere, the OCUZ product loaded, and the My / Health /
  Investment screens rebuilt
- [[Sessions/2026-09-04-3]] — the blank-page/MIME hunt: IDM eating every
  `.ts` URL, a broken `pnpm build`, and four dev servers at once
- [[Sessions/2026-09-04-2]] — first boot of the API: build cache, unbuilt
  workspace packages, type-only imports, and a global-guard wiring bug
- [[Sessions/2026-09-04]] — vault created
