# Kasir UMKM

A free point-of-sale PWA for small Indonesian businesses: toko kelontong, warung makan, pedagang kaki lima, and simple service sellers. Static site, no backend, all data in IndexedDB on the device.

## Stack

- Vite + React (hash routing, no router that needs server rewrites)
- Dexie over IndexedDB, no server, no API layer
- vite-plugin-pwa with Workbox, `registerType: 'prompt'`
- Web Bluetooth for 58mm ESC/POS thermal printing
- Deployed to GitHub Pages at a repo subpath

## Commands

```bash
npm run dev        # local dev
npm run build      # production build to dist/
npm run preview    # serve the build, use this to test the service worker
npm run test       # unit tests
npm run lint
```

Service worker behaviour only appears in `preview` and production, never in `dev`. Test any offline or update change against `preview`.

## Layout

```
src/
  data/        Dexie schema, migrations, repositories. No network, ever.
  domain/      pure calculations: totals, margins, stock movements
  profiles/    business profile presets and feature flag defaults
  printer/     receipt builder, ESC/POS encoder, Bluetooth transport
  ui/          screens and components
  strings/     all Bahasa Indonesia user-facing text
```

## Rules that always apply

- Money is an integer number of rupiah. Never a float, never cents.
- The app must work fully with the network off. Nothing in `src/data/` may await a network call.
- Sales, ledger entries, and stock movements are append-only. Corrections are reversing records.
- Optional features are gated on `settings.features`. When a flag is off the field or control is **absent**, not disabled.
- `trackStock` is read per item, never globally.
- All user-facing strings are Bahasa Indonesia and live in `src/strings/`.
- IDs are ULIDs generated on the device.
- `src/domain/` stays pure and unit-tested. No DOM, no Dexie, no Bluetooth.

## Detailed guidance

Deeper rules live in `.claude/skills/`. Consult `kasir-domain` for business rules and feature flags, `local-first-data` for persistence, `escpos-receipt` for printing, `pwa-offline` for delivery and updates, and `ui-kasir` for interface and copy.
