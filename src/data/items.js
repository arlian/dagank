// Items, and the movements that derive their stock.

import { db, newId, stamps, touch } from './db.js';
import {
  opnameMovement,
  purchaseMovement,
  stockByItem,
  wasteMovement,
} from '../domain/stock.js';

const alive = (row) => !row.deletedAt;

/** Blank item. `trackStock` is per item, never inherited from a global setting. */
export const emptyItem = () => ({
  name: '',
  price: 0,
  cost: null,
  category: null,
  barcode: null,
  unit: null,
  units: [],
  trackStock: false,
  minStock: null,
  modifiers: [],
  gridColor: null,
  sample: false,
});

export const listItems = () => db.items.filter(alive).sortBy('name');

export const getItem = (id) => db.items.get(id);

export const findByBarcode = async (barcode) => {
  const found = await db.items.where('barcode').equals(barcode).first();
  return found && alive(found) ? found : undefined;
};

/** Name and barcode match at once, so one field serves both habits. */
export async function searchItems(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const all = await listItems();
  return all.filter(
    (i) => i.name.toLowerCase().includes(q) || (i.barcode ?? '').includes(q),
  );
}

export async function createItem(draft, { stokAwal = 0 } = {}) {
  const item = { ...emptyItem(), ...draft, id: newId(), ...stamps() };

  await db.transaction('rw', db.items, db.movements, async () => {
    await db.items.add(item);
    if (item.trackStock && stokAwal) {
      await db.movements.add({
        id: newId(),
        itemId: item.id,
        type: 'purchase',
        qty: stokAwal,
        saleId: null,
        note: 'Stok awal',
        ...stamps(),
      });
    }
  });

  return item;
}

/** Items are mutable; their price history lives in the sale lines. */
export const updateItem = (id, patch) => db.items.update(id, touch(patch));

/** Soft delete. A hard delete would make a future merge ambiguous. */
export const deleteItem = (id) => db.items.update(id, touch({ deletedAt: Date.now() }));

export async function removeSampleItems() {
  const samples = await db.items.filter((i) => i.sample && alive(i)).toArray();
  await db.transaction('rw', db.items, async () => {
    for (const item of samples) {
      await db.items.update(item.id, touch({ deletedAt: Date.now() }));
    }
  });
  return samples.length;
}

/** Stock is derived from movements, never read from a stored counter. */
export const stockFor = async (itemId) => {
  const movements = await db.movements.where('itemId').equals(itemId).toArray();
  return movements.reduce((sum, m) => sum + m.qty, 0);
};

export const allStock = async () => stockByItem(await db.movements.toArray());

const addMovement = (movement) =>
  db.movements.add({ id: newId(), saleId: null, note: null, ...movement, ...stamps() });

/** Barang masuk. Appended, never an edit of a stored counter. */
export const recordPurchase = (itemId, qty, note = null) =>
  addMovement(purchaseMovement(itemId, qty, note));

/** Rusak or kadaluarsa. */
export const recordWaste = (itemId, qty, note = null) =>
  addMovement(wasteMovement(itemId, qty, note));

/**
 * Stok opname. The previous figure is read inside the transaction rather than
 * passed in from the screen, because a sale rung up while the shelf was being
 * counted would otherwise be silently swallowed by the adjustment.
 */
export async function recordOpname(itemId, counted) {
  return db.transaction('rw', db.movements, async () => {
    const previous = await stockFor(itemId);
    return addMovement(opnameMovement(itemId, counted, previous));
  });
}

/**
 * Why a number changed, newest first. This is the whole support story.
 *
 * Ordered by id rather than createdAt: the ids are monotonic ULIDs, so they
 * separate two movements written inside the same millisecond, which a
 * timestamp cannot.
 */
export async function movementsFor(itemId, limit = 20) {
  const rows = await db.movements.where('itemId').equals(itemId).toArray();
  return rows.sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, limit);
}

/** The few items that account for most sales, for the "sering dibeli" row. */
export async function frequentItems(limit = 4) {
  const since = Date.now() - 30 * 86_400_000;
  const recent = await db.sales.where('createdAt').above(since).primaryKeys();
  if (!recent.length) return [];

  const recentSet = new Set(recent);
  const lines = await db.saleLines.filter((l) => recentSet.has(l.saleId)).toArray();

  const counts = new Map();
  for (const line of lines) {
    counts.set(line.itemId, (counts.get(line.itemId) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const items = await Promise.all(ranked.map(([id]) => db.items.get(id)));
  return items.filter((i) => i && alive(i));
}
