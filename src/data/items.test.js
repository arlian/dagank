import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, TABLES } from './db.js';
import {
  createItem,
  deleteItem,
  findByBarcode,
  movementsFor,
  recordOpname,
  recordPurchase,
  recordWaste,
  searchItems,
  stockFor,
} from './items.js';

beforeEach(async () => {
  for (const table of TABLES) await db.table(table).clear();
});

describe('findByBarcode', () => {
  it('finds the item carrying that code', async () => {
    const item = await createItem({ name: 'Teh kotak', price: 4000, barcode: '8992761111051' });
    expect((await findByBarcode('8992761111051'))?.id).toBe(item.id);
  });

  it('returns nothing for a code no item carries', async () => {
    await createItem({ name: 'Teh kotak', price: 4000, barcode: '111' });
    expect(await findByBarcode('999')).toBeUndefined();
  });

  // This is what the item form's duplicate guard rests on: a deleted item must
  // not keep reserving its barcode, or the code can never be reused.
  it('ignores a soft-deleted item, freeing its barcode', async () => {
    const item = await createItem({ name: 'Teh kotak', price: 4000, barcode: '111' });
    await deleteItem(item.id);
    expect(await findByBarcode('111')).toBeUndefined();
  });

  it('does not match an item that has no barcode at all', async () => {
    await createItem({ name: 'Nasi goreng', price: 15000 });
    expect(await findByBarcode('')).toBeUndefined();
  });
});

describe('searchItems', () => {
  beforeEach(async () => {
    await createItem({ name: 'Minyak goreng 1 L', price: 18000, barcode: '8991002101019' });
    await createItem({ name: 'Mie instan', price: 3500 });
  });

  it('waits for two characters before returning anything', async () => {
    expect(await searchItems('m')).toHaveLength(0);
    expect((await searchItems('mi')).length).toBeGreaterThan(0);
  });

  it('matches on name regardless of case', async () => {
    const found = await searchItems('MINYAK');
    expect(found.map((i) => i.name)).toContain('Minyak goreng 1 L');
  });

  // One field serves both habits: typing the name, or a scanner typing digits.
  it('matches on barcode from the same field', async () => {
    const found = await searchItems('8991002101019');
    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('Minyak goreng 1 L');
  });
});

describe('createItem', () => {
  it('records opening stock as a movement, not as a stored counter', async () => {
    const item = await createItem(
      { name: 'Air mineral', price: 4000, trackStock: true },
      { stokAwal: 24 },
    );
    expect(await stockFor(item.id)).toBe(24);
    expect((await db.movements.toArray())[0].type).toBe('purchase');
  });

  it('writes no movement when the item does not track stock', async () => {
    await createItem({ name: 'Nasi goreng', price: 15000 }, { stokAwal: 10 });
    expect(await db.movements.count()).toBe(0);
  });
});

describe('stock movements', () => {
  const beras = () =>
    createItem({ name: 'Beras 1 kg', price: 13000, trackStock: true }, { stokAwal: 10 });

  it('adds what a kulakan run brought in', async () => {
    const item = await beras();
    await recordPurchase(item.id, 24, 'Kulakan pasar');
    expect(await stockFor(item.id)).toBe(34);
  });

  it('takes waste off the shelf under its own type', async () => {
    const item = await beras();
    await recordWaste(item.id, 2, 'Kena air');
    expect(await stockFor(item.id)).toBe(8);
    const [latest] = await movementsFor(item.id);
    expect(latest).toMatchObject({ type: 'waste', qty: -2, note: 'Kena air' });
  });

  it('sets stock to the counted figure and keeps the shrinkage visible', async () => {
    const item = await beras();
    await recordOpname(item.id, 7);

    expect(await stockFor(item.id)).toBe(7);
    const [latest] = await movementsFor(item.id);
    expect(latest).toMatchObject({ type: 'adjustment', qty: -3, counted: 7, previous: 10 });
  });

  // The reason opname reads its own "previous" instead of taking one from the
  // screen: a sale rung up while the shelf was being counted must not be
  // swallowed by the adjustment.
  it('reads the previous figure at write time, not at screen-open time', async () => {
    const item = await beras();
    await recordWaste(item.id, 4); // something moves after the screen opened
    await recordOpname(item.id, 7);

    const [latest] = await movementsFor(item.id);
    expect(latest.previous).toBe(6);
    expect(await stockFor(item.id)).toBe(7);
  });

  it('corrects by appending, never by editing what was already written', async () => {
    const item = await beras();
    await recordOpname(item.id, 7);
    expect(await db.movements.where('itemId').equals(item.id).count()).toBe(2);
  });

  it('lists the history newest first', async () => {
    const item = await beras();
    await recordPurchase(item.id, 5);
    const history = await movementsFor(item.id);
    expect(history.map((m) => m.type)).toEqual(['purchase', 'purchase']);
    expect(history[0].createdAt).toBeGreaterThanOrEqual(history[1].createdAt);
  });
});
