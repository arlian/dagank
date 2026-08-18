// Adding the expenses table moved SCHEMA_VERSION from 1 to 2. A shop that
// exported before that upgrade is holding a file with no expenses key in it
// and a lower version number on it, and that file is their only copy of their
// history. It has to keep restoring.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { db, SCHEMA_VERSION, TABLES } from './db.js';
import { buildBackup, importBackup } from './backup.js';
import { createItem } from './items.js';
import { recordExpense } from './expenses.js';

beforeEach(async () => {
  for (const table of TABLES) await db.table(table).clear();
});

test('a backup taken before the expenses table still restores', async () => {
  const lama = {
    app: 'kasir-umkm',
    schemaVersion: 1,
    exportedAt: Date.now() - 86_400_000,
    data: {
      meta: [],
      items: [
        {
          id: '01J0000000000000000000000A',
          name: 'Beras 1 kg',
          price: 13000,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      ],
      sales: [],
      saleLines: [],
      movements: [],
      customers: [],
      ledger: [],
      shifts: [],
      // No expenses key at all: the table did not exist when this was written.
    },
  };

  await recordExpense({ amount: 5000 });
  const { restoredAt } = await importBackup(JSON.stringify(lama));

  expect(restoredAt).toBe(lama.exportedAt);
  expect(await db.items.count()).toBe(1);
  // Replaced, not merged, exactly as it says on the button.
  expect(await db.expenses.count()).toBe(0);
});

test('a backup from a newer build is refused rather than half-read', async () => {
  const baru = { app: 'kasir-umkm', schemaVersion: SCHEMA_VERSION + 1, data: {} };
  await expect(importBackup(JSON.stringify(baru))).rejects.toThrow('versiSalah');
});

test('expenses ride along in a new backup and come back whole', async () => {
  await createItem({ name: 'Beras 1 kg', price: 13000 });
  await recordExpense({ amount: 5000, category: 'transport', note: 'Bensin' });

  const backup = await buildBackup();
  expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
  expect(backup.data.expenses).toHaveLength(1);

  for (const table of TABLES) await db.table(table).clear();
  await importBackup(JSON.stringify(backup));

  const [restored] = await db.expenses.toArray();
  expect(restored.amount).toBe(5000);
  expect(restored.note).toBe('Bensin');
  expect(restored.dariLaci).toBe(true);
});
