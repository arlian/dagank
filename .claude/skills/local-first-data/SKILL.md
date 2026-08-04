---
name: local-first-data
description: Data layer rules for a local-first offline app storing everything in IndexedDB via Dexie, with no server. Use this whenever adding or changing a table, writing a query, generating IDs, doing a schema migration, or building backup, export, import, or optional cloud sync. Trigger it before writing any persistence code at all, since the offline-only and append-only constraints here are easy to violate accidentally and expensive to unwind later.
---

# Local-first data layer

There is no backend. The device is the database, the shop owns its data, and the app must work perfectly with the network switched off, forever, not just as a degraded fallback. Every rule below exists to protect that property or to keep a future optional sync layer possible without a rewrite.

## Non-negotiables

1. **No function in the data layer may await the network.** Not a fetch, not a Firebase call, not an analytics ping. If a feature seems to need one, it belongs in an optional module above the data layer that the app runs fine without.
2. **IDs are generated on the device**, never by a server and never as an auto-increment integer. Use ULID or UUIDv7. Both are sortable by creation time, which gives free chronological ordering and makes a later merge between two devices collision-free.
3. **Records are append-only where money is involved.** Sales, payments, and stock movements are written once. Corrections are new reversing records. Products, customers, and settings may be updated in place.
4. **Every record carries `createdAt`, `updatedAt`, and `deletedAt`.** Deletes are soft. A hard delete makes any future sync unable to distinguish "deleted here" from "created there".
5. **Money is an integer.** See the kasir-domain skill.

## Schema

```js
import Dexie from 'dexie';

export const db = new Dexie('kasir');

db.version(1).stores({
  meta:        'key',        // settings, feature flags, schema + export bookkeeping
  items:       'id, barcode, name, category, deletedAt',
  sales:       'id, createdAt, customerId, status',
  saleLines:   'id, saleId, itemId',
  movements:   'id, itemId, createdAt, type',
  customers:   'id, name, deletedAt',
  ledger:      'id, customerId, createdAt',
  shifts:      'id, openedAt',
});
```

Index only what is queried. Every index costs write time on a cheap phone. The indexes above cover the real access patterns: barcode lookup at the till, item search by name, grid loads by category, sales for a date range, movements for one item, ledger for one customer.

`saleLines` is a separate table rather than an array on the sale, because the daily margin report scans lines across many sales and loading whole sale documents to do that is wasteful once a shop has a year of history.

## Migrations

Dexie handles the store definitions. Data reshaping is your job and it runs on a device you cannot inspect, so it must be defensive.

```js
db.version(2).stores({
  items: 'id, barcode, name, category, deletedAt, gridColor',
}).upgrade(async (tx) => {
  await tx.table('items').toCollection().modify((p) => {
    if (p.gridColor === undefined) p.gridColor = null;
  });
});
```

Rules for migrations:

- **Never delete a field in the same version that stops using it.** Stop writing it, ship, wait, remove it two versions later. A user who has not opened the app in three months will jump several versions at once.
- **Never rewrite historical sales or lines in a migration.** Backfill a nullable field if you must, but the recorded prices, costs, and totals are evidence and are not yours to change.
- Migrations must be idempotent and must tolerate partially migrated data, because a phone can be killed mid-upgrade.
- Write the app version into `meta` after a successful upgrade, so the diagnostics screen can report which schema a confused user is actually running.

## Queries

Keep queries in a repository module (`src/data/`), never inline in components. The reason is not purity, it is that the export, the reports, and any future sync all need the same access paths, and duplicating a filter for `deletedAt` in fourteen components guarantees one of them will be wrong.

Always filter soft-deleted rows at the repository boundary:

```js
export const listItems = () =>
  db.items.filter((p) => !p.deletedAt).sortBy('name');

export const findByBarcode = (barcode) =>
  db.items.where('barcode').equals(barcode).first();
```

Wrap anything that touches more than one table in a transaction, so a killed tab cannot leave a sale without its lines:

```js
export async function recordSale(sale, lines, movements) {
  await db.transaction('rw', db.sales, db.saleLines, db.movements, async () => {
    await db.sales.add(sale);
    await db.saleLines.bulkAdd(lines);
    await db.movements.bulkAdd(movements);
  });
}
```

## Derived values

Current stock, customer balance, and daily totals are **derived from movement and ledger records**, not stored as mutable counters. A cached copy is fine for speed, but it must be rebuildable from the source records with a single function, and the diagnostics screen should offer a "hitung ulang" button that does exactly that. When a user reports a wrong number, that button is your entire support process.

## Backup and export

This is the single most important feature in the app and it is the one most likely to be postponed. Do not postpone it.

- **Export**: a full JSON dump of every table plus a `schemaVersion` and an export timestamp, offered through the Web Share API so the owner can send it to their own WhatsApp or save it to Drive, with a plain file download as fallback.
- **Import**: reads the dump, checks `schemaVersion`, and either replaces everything or refuses clearly. Do not attempt a clever merge on import. "Ganti semua data dari file ini" is understandable, a silent partial merge is not.
- **CSV export** for sales and for items separately, because owners who do keep records keep them in Excel.
- **Automatic reminder**: track `meta.lastExportAt` and show a dismissible banner after seven days without an export.
- Ask for durable storage on first run so the browser is less likely to evict the database:

```js
if (navigator.storage?.persist) await navigator.storage.persist();
```

## Optional sync, later

Sync is not part of v1. But keep these three properties from day one and adding it later is an evening of work rather than a rewrite:

- device-generated sortable IDs
- append-only money records with reversing corrections
- `updatedAt` and soft deletes on everything

With those, a merge is last-write-wins on mutable records and pure union on the append-only ones, which needs no conflict resolution UI. If sync is added, it goes in `src/sync/` behind a feature flag, it is opt-in per shop, and the app must still start and operate with the module absent.

## Self-check

- Does any new data-layer function touch the network? Remove it.
- Is the new table indexed only on fields that are actually queried?
- Did I add `createdAt`, `updatedAt`, `deletedAt`?
- Does the export include the new table?
- Does the migration survive being run on a two-versions-old database?
