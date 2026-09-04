# Decisions (ADRs)

One file per decision that would otherwise only live in someone's memory of
a chat. Naming convention: `NNNN-short-title.md`, numbered sequentially.
Write one when a choice is made that isn't obvious from reading the code —
a trade-off, a constraint from the brief, a "we considered X but did Y
because Z." Skip it for anything the code or [docs/](../../docs) already
makes self-evident.

Template:

```markdown
# NNNN — Title

Date: YYYY-MM-DD

## Context
What prompted this decision.

## Decision
What was decided.

## Why
The reasoning / trade-offs.

## Status
Proposed | Accepted | Superseded by [[NNNN-...]]
```

## Index

- [[0001-ledger-as-source-of-truth]]
- [[0002-bonus-calculation-not-automated]]
- [[0003-internal-packages-ship-compiled-output]]
- [[0004-no-type-only-imports-for-injectables]]
- [[0005-node-22-baseline]]
- [[0006-internal-packages-ship-dual-esm-cjs]]
- [[0007-mirror-the-ptg-business-app]]
