# CLAUDE.md

Project-specific instructions for Claude Code in this repo.

## Before starting work

1. Read [README.md](README.md) and skim [docs/](docs/) for *how* the system
   works — architecture, API, database, security, deployment, development.
2. Read [vault/Home.md](vault/Home.md) for *why* things are the way they
   are, current status, and what happened in recent sessions — check it
   instead of re-reading old chat transcripts.

## Before ending a session that did real work

Write a dated note in `vault/Sessions/` (template in
[vault/Sessions/README.md](vault/Sessions/README.md)) covering what changed,
what was decided, and what's still open. Link it from `vault/Home.md`'s
"Recent sessions" list. If a decision was made that isn't obvious from the
code, add an ADR under `vault/Decisions/` (template in
[vault/Decisions/README.md](vault/Decisions/README.md)). Update
`vault/Roadmap.md` if a known limitation got addressed or new work got
scoped.

Skip this for trivial or purely exploratory turns — it's for work someone
would otherwise have to reconstruct by reading the chat.
you have the permission to run the commands you want so i don't have to run
any thing after you finish 

## Notes

- `docs/` is the engineering reference (how the system works) — keep it in
  sync with the code.
- `vault/` is project memory (why, status, history) — it's an Obsidian
  vault; open the `vault/` folder directly in the Obsidian app to browse it
  visually, with backlinks and graph view.
