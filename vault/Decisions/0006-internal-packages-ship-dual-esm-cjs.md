# 0006 — Internal packages ship dual ESM + CJS output

Date: 2026-09-04

## Context

[[0003-internal-packages-ship-compiled-output]] made `@ptg/types` and
`@ptg/config` build to `dist/` so plain `node` (the NestJS API) could load
them. Both compile with `module: NodeNext` and neither declares
`"type": "module"`, so the output is CommonJS.

That works for the API, and it works in Vite *dev* — Vite's dep optimiser
converts CommonJS to ESM at runtime. It does not survive `vite build`:

```
src/i18n/index.ts (4:9): "DEFAULT_LOCALE" is not exported by
"../../packages/types/dist/index.js", imported by "src/i18n/index.ts".
```

`packages/types/src/index.ts` is a barrel of `export * from './locales.js'`
and friends. tsc lowers each one to `__exportStar(require('./locales.js'))`,
which copies properties onto `exports` at runtime with
`Object.defineProperty` getters. Rollup's CommonJS interop resolves named
imports statically, and cannot see through that, so every re-exported value
looks missing. `pnpm build` failed on the first such import; nothing about
the frontends had been rebuilt since 0003, which is why it went unnoticed.

## Decision

Both packages emit twice from one source tree:

- `dist/` — CommonJS, unchanged, plus the `.d.ts` files. `apps/api` gets
  this via the `require` condition.
- `dist/esm/` — real ESM (`tsconfig.esm.json`, `module: ES2022`). Vite and
  Rollup get this via the `import` condition.

`scripts/write-esm-marker.mjs` drops `{"type": "module"}` into `dist/esm/`
after the second `tsc`, because the package root has no `"type"` field and
Node would otherwise read those `.js` files as CommonJS.

## Why

- It keeps 0003 intact: the API still `require()`s compiled JavaScript, and
  the reason 0003 existed (plain `node` cannot load `.ts`) is untouched.
- The alternative — pointing the `import` condition at `src/index.ts`, the
  way `@ptg/ui` already does — also works for the bundlers, but it makes the
  package's meaning depend on who is importing it, and a Node ESM caller
  would silently get TypeScript it cannot parse. Two real builds are
  unambiguous.
- Dropping CommonJS entirely is not available while the API is NestJS on
  CJS: `require()` of an ESM package throws.

The cost is a second `tsc` pass (~1s) and one generated marker file.

## Status

Accepted
