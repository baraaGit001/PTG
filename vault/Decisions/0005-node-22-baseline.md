# 0005 — Node 22 is the baseline everywhere

Date: 2026-09-04

## Context

The repo pinned `packageManager: pnpm@11.5.2` but declared
`engines: { node: ">=20.11" }`, and every Dockerfile plus the CI workflow ran
Node 20. pnpm 11 imports `node:sqlite`, which first ships in Node 22, so
`corepack enable && pnpm install` inside any image failed immediately:

```
Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
```

The declared engine range and the pinned package manager were incompatible, so
no image could ever have been built. Local development had not hit this because
the machine runs Node 22.18.

## Decision

Node 22 is the floor: `engines` is `>=22`, the three Dockerfiles use
`node:22-alpine`, and CI uses `node-version: 22`.

## Why

The alternative was downgrading pnpm to a version that still supports Node 20.
Node 20 goes end-of-life before this project would plausibly ship, and the
lockfile is already in pnpm 11 format, so moving forward costs less than
pinning back. Raising `engines` to match reality also makes the mismatch fail
loudly at install time on a contributor's machine rather than silently much
later inside a Docker build.

## Status

Accepted
