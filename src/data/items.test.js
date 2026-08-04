import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, TABLES } from './db.js';
import { createItem, deleteItem, findByBarcode, searchItems, stockFor } from './items.js';

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
