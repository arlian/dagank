import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, TABLES } from './db.js';
import { createItem } from './items.js';
import { lineFromItem, recordSale, voidSale, salesOn } from './sales.js';
import { createCustomer, balanceFor } from './customers.js';
import { stockFor } from './items.js';

beforeEach(async () => {
  for (const table of TABLES) await db.table(table).clear();
});

const anItem = (over = {}) =>
  createItem({
    name: 'Teh kotak',
    price: 4000,
    cost: 3200,
    trackStock: true,
    ...over,
  });

describe('recordSale', () => {
  it('writes the sale, its lines, and its movements together', async () => {
    const item = await anItem();
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 3 })],
      payment: { method: 'tunai', paid: 20000 },
    });

    expect(sale.total).toBe(12000);
    expect(sale.payment.change).toBe(8000);
    expect(await db.saleLines.where('saleId').equals(sale.id).count()).toBe(1);
    expect(await stockFor(item.id)).toBe(-3);
  });

  it('writes no movement for an item that does not track stock', async () => {
    const item = await anItem({ trackStock: false });
    await recordSale({
      lines: [lineFromItem(item, { qty: 3 })],
      payment: { method: 'tunai', paid: 12000 },
    });
    expect(await db.movements.count()).toBe(0);
  });

  it('snapshots the price, so repricing the item later does not rewrite history', async () => {
    const item = await anItem();
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 1 })],
      payment: { method: 'tunai', paid: 4000 },
    });

    await db.items.update(item.id, { price: 9000 });

    const [line] = await db.saleLines.where('saleId').equals(sale.id).toArray();
    expect(line.price).toBe(4000);
    expect((await db.sales.get(sale.id)).total).toBe(4000);
  });

  it('records the unpaid remainder as utang against the customer', async () => {
    const item = await anItem({ price: 26000, trackStock: false });
    const customer = await createCustomer({ name: 'Bu Sri' });

    await recordSale({
      lines: [lineFromItem(item, { qty: 1 })],
      payment: { method: 'utang', paid: 6000 },
      customerId: customer.id,
    });

    expect(await balanceFor(customer.id)).toBe(20000);
  });

  it('refuses an empty sale', async () => {
    await expect(recordSale({ lines: [], payment: { method: 'tunai', paid: 0 } })).rejects.toThrow();
  });
});

describe('voidSale', () => {
  it('returns the stock with a reversing movement and leaves the original', async () => {
    const item = await anItem();
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 3 })],
      payment: { method: 'tunai', paid: 12000 },
    });

    await voidSale(sale.id);

    expect(await stockFor(item.id)).toBe(0);
    const movements = await db.movements.where('saleId').equals(sale.id).toArray();
    expect(movements).toHaveLength(2);
    expect(movements.filter((m) => m.type === 'sale')[0].qty).toBe(-3);
  });

  it('never alters the recorded money', async () => {
    const item = await anItem({ trackStock: false });
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 2 })],
      payment: { method: 'tunai', paid: 8000 },
    });

    await voidSale(sale.id);

    const after = await db.sales.get(sale.id);
    expect(after.total).toBe(8000);
    expect(after.status).toBe('batal');
    expect(await db.saleLines.where('saleId').equals(sale.id).count()).toBe(1);
  });

  it('cancels the debt it created', async () => {
    const item = await anItem({ price: 26000, trackStock: false });
    const customer = await createCustomer({ name: 'Bu Sri' });
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 1 })],
      payment: { method: 'utang', paid: 6000 },
      customerId: customer.id,
    });

    await voidSale(sale.id);

    expect(await balanceFor(customer.id)).toBe(0);
  });

  it('is safe to run twice', async () => {
    const item = await anItem();
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 3 })],
      payment: { method: 'tunai', paid: 12000 },
    });

    await voidSale(sale.id);
    await voidSale(sale.id);

    expect(await stockFor(item.id)).toBe(0);
  });
});

describe('salesOn', () => {
  it('returns today and excludes yesterday', async () => {
    const item = await anItem({ trackStock: false });
    const sale = await recordSale({
      lines: [lineFromItem(item, { qty: 1 })],
      payment: { method: 'tunai', paid: 4000 },
    });
    await db.sales.update(sale.id, { createdAt: Date.now() - 2 * 86_400_000 });

    expect(await salesOn()).toHaveLength(0);
  });
});
