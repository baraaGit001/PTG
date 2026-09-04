# 0001 — Postgres ledger as the single source of truth for money and points

Date: 2026-09-04

## Context

Money and points (wallet balances, bonuses, inventory) need one place that
can't drift from what actually happened across two frontends and an admin
console.

## Decision

All money/points state is derived from a transactional Postgres ledger — no
parallel/cached balance that can go out of sync.

## Why

Correctness of financial data outranks convenience. See
[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) § "Ledger discipline
(wallet, points, inventory)".

## Status

Accepted (baseline architecture, predates this vault).
