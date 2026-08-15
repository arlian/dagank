import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, TABLES } from './db.js';
import { closeShift, currentShift, openShift, recentShifts, shiftTotals } from './shifts.js';
import { createItem } from './items.js';
import { recordSale } from './sales.js';
import { createCustomer, recordPayment } from './customers.js';

let teh;

beforeEach(async () => {
  for (const table of TABLES) await db.table(table).clear();
  teh = await createItem({ name: 'Teh kotak', price: 4000 });
});

const jual = (paid, method = 'tunai', customerId = null) =>
  recordSale({
    lines: [{ itemId: teh.id, name: teh.name, price: 4000, qty: 1, factor: 1 }],
    payment: { method, paid },
    customerId,
  });

describe('openShift', () => {
  it('starts a shift with the counted opening float', async () => {
    const shift = await openShift(200000);
    expect(shift.kasAwal).toBe(200000);
    expect(shift.closedAt).toBeNull();
    expect((await currentShift())?.id).toBe(shift.id);
  });

  // Two open shifts would make every total ambiguous, and the screen offering
  // "buka kasir" twice is a double tap, not an intention.
  it('never opens a second shift while one is running', async () => {
    const first = await openShift(200000);
    const second = await openShift(999000);
    expect(second.id).toBe(first.id);
    expect(await db.shifts.count()).toBe(1);
  });

  it('reports no shift before the drawer has been opened', async () => {
    expect(await currentShift()).toBeNull();
  });
});

describe('shiftTotals', () => {
  it('adds up the cash a shift took in', async () => {
    const shift = await openShift(100000);
    await jual(4000);
    await jual(50000); // tendered big, change given

    const totals = await shiftTotals(shift);
    expect(totals.tunai).toBe(8000);
    expect(totals.seharusnya).toBe(108000);
    expect(totals.transaksi).toBe(2);
  });

  it('counts a repayment on an old tab, which is cash in the same drawer', async () => {
    const customer = await createCustomer({ name: 'Bu Sri' });
    const shift = await openShift(100000);
    await recordPayment(customer.id, 25000);

    const totals = await shiftTotals(shift);
    expect(totals.pembayaranUtang).toBe(25000);
    expect(totals.seharusnya).toBe(125000);
  });

  // The reason totals are bounded by time: yesterday's takings must not turn
  // up in this morning's drawer.
  it('leaves out sales made before the shift opened', async () => {
    await jual(4000);
    const shift = await openShift(100000);
    await jual(4000);

    expect((await shiftTotals(shift)).tunai).toBe(4000);
  });

  it('does not count a voided sale', async () => {
    const shift = await openShift(0);
    const sale = await jual(4000);
    const { voidSale } = await import('./sales.js');
    await voidSale(sale.id);

    expect((await shiftTotals(shift)).tunai).toBe(0);
  });
});

describe('closeShift', () => {
  it('stores the counted drawer and the difference', async () => {
    const shift = await openShift(100000);
    await jual(4000);

    const closed = await closeShift(shift.id, 102000);
    expect(closed.kasAkhir).toBe(102000);
    expect(closed.seharusnya).toBe(104000);
    expect(closed.selisih).toBe(-2000);
    expect(closed.closedAt).toBeTruthy();
  });

  it('reports a drawer that balances as no difference at all', async () => {
    const shift = await openShift(100000);
    await jual(4000);
    expect((await closeShift(shift.id, 104000)).selisih).toBe(0);
  });

  it('frees the app to open the next shift', async () => {
    const shift = await openShift(100000);
    await closeShift(shift.id, 100000);
    expect(await currentShift()).toBeNull();

    const next = await openShift(50000);
    expect(next.id).not.toBe(shift.id);
  });

  it('refuses to close a shift twice, so the first count stands', async () => {
    const shift = await openShift(100000);
    await closeShift(shift.id, 100000);
    expect(await closeShift(shift.id, 777000)).toBeNull();
    expect((await db.shifts.get(shift.id)).kasAkhir).toBe(100000);
  });

  // Closing summarises the money records; it must never rewrite them.
  it('leaves the sales it summarised untouched', async () => {
    const shift = await openShift(100000);
    const sale = await jual(4000);
    await closeShift(shift.id, 90000);

    const after = await db.sales.get(sale.id);
    expect(after.total).toBe(4000);
    expect(after.status).toBe('selesai');
  });
});

describe('recentShifts', () => {
  it('lists only closed shifts, newest first', async () => {
    const first = await openShift(10000);
    await closeShift(first.id, 10000);
    const second = await openShift(20000);
    await closeShift(second.id, 20000);
    await openShift(30000); // still running

    const history = await recentShifts();
    expect(history.map((s) => s.kasAwal)).toEqual([20000, 10000]);
  });
});
