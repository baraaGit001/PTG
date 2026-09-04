# 0009 — Environment booleans are parsed, never `z.coerce.boolean()`

Date: 2026-09-04

## Context

`apps/api/src/config/env.validation.ts` declared its three boolean settings as
`z.coerce.boolean()`:

```ts
COOKIE_SECURE: z.coerce.boolean().default(false),
S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
DEMO_MODE: z.coerce.boolean().default(true),
```

`z.coerce.boolean()` is `Boolean(value)`. Environment variables are always
strings, and every non-empty string is truthy — so `COOKIE_SECURE=false`
parsed to **`true`**, and so did `DEMO_MODE=false`. Only an *empty* value
produced `false`.

This surfaced while deploying to a plain-HTTP server. A `Secure` cookie sent
over `http://` is dropped by the browser without an error anywhere: no
exception, no log line, nothing in the network tab but a refresh call that
never sees its cookie. Sign-in simply stops working. It had been latent in
`.env.example` — which ships `COOKIE_SECURE=false` — since the file was
written.

## Decision

Booleans read from the environment go through an explicit parser that reads
the *word*:

```ts
const envBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean' ? value : ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()),
  );
```

`z.coerce.boolean()` is not to be used on anything sourced from
`process.env`. `z.coerce.number()` is fine and stays — `Number('900')` means
what it looks like.

## Why

The failure mode is the expensive kind: silent, remote, and in the auth path,
where the symptom ("login doesn't work on the server") points nowhere near the
cause. A four-line parser removes the whole class.

Reading `'1' | 'true' | 'yes' | 'on'` as true and everything else as false
matches what a `.env` author means, and keeps `COOKIE_SECURE=false` honest.

Related: [[0004-no-type-only-imports-for-injectables]] — the same shape of
trap, where a construct that reads as correct compiles fine and fails only at
runtime.

## Status

Accepted.
