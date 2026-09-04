# 0004 — No type-only imports for injectables in the API

Date: 2026-09-04

## Context

Every injected dependency in `apps/api` was imported with `import type`, and
every validation DTO used as a `@Query()`/`@Body()` parameter was too — 128
imports across 52 files. Nest could not resolve a single provider:

```
Nest can't resolve dependencies of the RbacService (?, Symbol(REDIS_CLIENT)).
Please make sure that the argument Function at index [0] is available ...
```

`import type` is erased at compile time, so `emitDecoratorMetadata` has no
class left to write into `design:paramtypes` and emits `Function` instead.
The injector then has no token to look up. The same erasure hits
`ValidationPipe`: with the DTO class gone, it validates against bare `Object`,
whitelists nothing, and `forbidNonWhitelisted` rejects every field — which is
why `GET /api/v1/products?page=1&pageSize=20&sortBy=newest` returned 400
`"property page should not exist"` even though `ProductListQueryDto` declares
all three.

The shared ESLint config set
`'@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }]`.
Its autofix cannot see the decorator-metadata dependency, so `--fix` had
rewritten these imports and silently broken the whole app.

## Decision

Anything the API needs at *runtime* is imported as a value, not a type:
injected providers, and DTO classes used as method parameters.
`@typescript-eslint/consistent-type-imports` is turned off in
`apps/api/eslint.config.js`.

Interfaces from `@ptg/types` (`CategoryDto`, `ProductSummaryDto`, …) stay
`import type` — they are types with no runtime representation, used as return
annotations only.

## Why

The rule is disabled only for the API, not removed from the shared config, so
the browser packages keep it — they have no `emitDecoratorMetadata` and the
rule is genuinely useful there. Leaving it on for the API with an
`allowImportingTsExtensions`-style carve-out isn't possible: the rule has no
notion of which parameter types the decorator metadata will need, so any
autofix run would reintroduce the bug.

## Status

Accepted
