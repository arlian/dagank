# Skills for the UMKM kasir app

Five Claude Code skills for a free, offline-first point-of-sale serving small Indonesian businesses of several kinds: toko kelontong, warung makan, pedagang kaki lima, and simple service sellers. They cover the parts where generic training-data patterns produce wrong code.

## Install

Project-scoped, committed with the repo so they travel with the codebase:

```bash
cp -r kasir-domain local-first-data escpos-receipt pwa-offline ui-kasir \
  /path/to/your-repo/.claude/skills/
```

Or personal, available in every project on your machine:

```bash
cp -r kasir-domain local-first-data escpos-receipt pwa-offline ui-kasir \
  ~/.claude/skills/
```

Claude Code watches these directories, so edits land within a session without a restart. If you create a top-level skills directory that did not exist when the session started, restart once so it gets watched.

## What each one is for

| Skill | Triggers on | Prevents |
|---|---|---|
| `kasir-domain` | items, prices, stock, sales, utang, reports, feature flags | generic e-commerce modelling, float money, features shown to profiles that do not need them |
| `local-first-data` | tables, queries, migrations, backup, sync | network calls in the data layer, server IDs, mutable money records |
| `escpos-receipt` | printing, struk, printer pairing, receipt layout | silent print failures from unchunked writes and wrong line width |
| `pwa-offline` | service worker, manifest, build config, updates | users stranded on a stale build, subpath and routing breakage |
| `ui-kasir` | any screen, component, string, or error message | desktop-shaped UI, English copy, small tap targets, extra taps per sale |

## The generalisation, in one idea

One app, several business profiles. A profile is nothing but a preset of feature flags picked once at onboarding and editable afterwards:

```js
settings.features = {
  stok, barcode, satuan, modifier, utang, modal,
  input: 'grid' | 'cari',
};
```

`kasir-domain/references/profil-usaha.md` holds the presets and a section per profile. It loads only when the task actually concerns onboarding or profile-specific behaviour, so the main skill stays small.

Two rules keep this from becoming a configuration jungle. A flag is only justified when at least two profiles genuinely differ on it, and the total should stay around eight. Needing a ninth usually means a new preset, not a new flag.

Two modelling points do most of the work:

- **`trackStock` is per item, not per shop.** A warung makan counts bottled drinks and not portions of nasi goreng.
- **`features.input` reshapes the Kasir screen.** Grid for small fixed menus, search plus scan for hundreds of items. This is the difference a user actually feels.

## Skills versus CLAUDE.md

Skills load on demand. Anything true in every session belongs in `CLAUDE.md`, where it is always present: stack, commands, folder layout, code style. A starter is included as `CLAUDE.md.example`.

The reverse also matters. The ESC/POS byte tables must not live in `CLAUDE.md`, or you pay for them in every conversation, including ones with no printer in sight.

## Tuning

The frontmatter `description` is the only part always in context and it decides whether a skill loads at the right moment. If a skill fails to trigger, make its description more specific about the situations it covers and slightly more insistent. If it triggers too often, narrow the listed contexts.

Keep each `SKILL.md` under roughly 500 lines. When one outgrows that, move detail into a `references/` file and point at it from the body, the way `kasir-domain` and `escpos-receipt` both do.
