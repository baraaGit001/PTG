# 0003 — Internal packages ship compiled output

Date: 2026-09-04

## Context

`@ptg/config` and `@ptg/types` originally pointed `main`/`types`/`exports` at
their raw sources (`./src/index.ts`), with no build step for `@ptg/config` at
all. That works for the Vite apps — `.ts` is in Vite's default
`resolve.extensions`, so it transforms workspace sources on the fly — but the
API is not a bundled app. `nest build` compiles only `apps/api`, and both
`pnpm dev:api` and the production image run the result under plain `node`.

Node cannot load `.ts`, so the first real boot of the API failed on
`ERR_MODULE_NOT_FOUND` for `packages/config/src/constants.js`: the sources use
NodeNext's `./constants.js` extension convention, which only resolves once
something has actually emitted `constants.js`. The API had never been run
before, so nothing had surfaced this.

## Decision

`@ptg/config` and `@ptg/types` are built to `dist/` and resolve there.

- Both `tsconfig.json`s keep `@ptg/tsconfig/base.json` but override
  `module`/`moduleResolution` to `NodeNext`, so the emitted JS is CommonJS —
  matching how `apps/api` emits (`require`), since no package sets
  `"type": "module"`.
- Both `package.json`s point `main`/`types`/`exports` at `./dist`;
  `@ptg/config` gained the `build` script it was missing.
- `apps/api/Dockerfile` builds both packages before building the API.

They keep extending `base.json` rather than `node.json`: these packages are
isomorphic (the browser apps import them too), so they must not pull in
`@types/node`.

## Why

The alternative was making the API run through a TypeScript-aware loader
(`tsx`/`ts-node`) so it could keep consuming sources directly. That was
rejected because it only fixes dev — `apps/api/package.json`'s `start` and the
Docker image both run `node dist/main.js`, so production would still need
compiled packages. Building them once is the smaller change and keeps dev and
prod on the same resolution path.

The cost is that editing `@ptg/config` or `@ptg/types` no longer hot-reloads
into the Vite apps; those packages must be rebuilt. They are low-churn
constants and type declarations, so this is an acceptable trade.

## Status

Accepted
