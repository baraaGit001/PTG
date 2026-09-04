# 0007 — The mobile app is the spec, not m.ptglife.com

Date: 2026-09-04

## Context

The web app is meant to be the browser equivalent of **PTG Business**
(`com.ptglife.business` on Google Play, published by PTG Passion Tech Group).
Up to this point the web app had been built from the written brief, so its
information architecture had drifted: pages existed but were generic
dashboard/e-commerce screens rather than the app's screens.

Two possible sources of truth were available:

1. `m.ptglife.com` — the developer URL on the Play listing. It serves a
   uni-app (Vue) SPA; its JS bundle could be mined for routes and API shapes.
2. The Play Store listing's screenshots of the shipped Android app.

## Decision

**The Android app's screens are the reference.** `m.ptglife.com` is explicitly
*not* the thing being cloned, and its bundle was not used.

Concretely, the app's IA that the web must match:

- Bottom tabs, in order: **Home · Goods · Health · Cart · My** (green active
  state, cart badge).
- **My** is a hub screen — identity + tier badge + Service Center, three
  balances (E-Account / Bonus Pool / Personal Points), an Investment Plan
  entry, four order-status shortcuts (Pay / Ship / Receive / Done), then the
  account menu. It is *not* the personal-information form.
- **Health** leads with a dark "Today's Overview" card (Steps / Calories /
  Exercise + Real-time refresh), then Health Management, Community + Sport
  Ranking side by side, then Health Knowledge.
- Prices are **ZAR** and every product line also shows **PV** (point value).
  PV tracks roughly `price / 36` across the real lineup.
- Product pages are a short gallery followed by a long full-bleed
  "Product Details" image scroll.

## Why

The store screenshots show what actually ships to members, including copy and
ordering that the brief never captured. The mobile web SPA is a separate
front-end that may lag or diverge from the app, and mining a third party's
bundle is a worse basis for our own implementation than reading its UI.

Recording this because the difference is invisible from the code: someone
looking for "how should this screen look" needs to know to open the Play
listing, not `m.ptglife.com`.

## Status

Accepted
