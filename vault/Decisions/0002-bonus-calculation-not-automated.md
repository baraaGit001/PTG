# 0002 — Bonus calculation stays manual, not an inferred formula

Date: 2026-09-04

## Context

The brief doesn't specify a bonus formula.

## Decision

`BonusRecord`s are created via explicit admin action (or a future,
separately-reviewed calculator service) rather than a formula inferred from
the brief.

## Why

Inventing an undocumented bonus formula risks being wrong about real money;
the brief explicitly prohibits it (see README "Known limitations").

## Status

Accepted — revisit if/when a calculator service is scoped and reviewed.
