import { describe, expect, it } from 'vitest';
import {
  bestSellers,
  byDay,
  cashTaken,
  dailyRecap,
  dayBounds,
  expenseFromDrawer,
  expenseTotal,
  isSameDay,
  rangeBounds,
  shiftSummary,
} from './report.js';

const sale = (over = {}) => ({
  id: 's1',
  total: 26000,
  status: 'selesai',
  payment: { method: 'tunai', paid: 26000 },
  ...over,
});

const line = (over = {}) => ({
  itemId: 'itm1',
  name: 'Nasi goreng',
  price: 12000,
  qty: 1,
  factor: 1,
  cost: null,
  modifiers: [],
  ...over,
});

describe('dayBounds', () => {
  it('spans local midnight to local midnight', () => {
    const { start, end } = dayBounds(new Date(2026, 7, 3, 20, 30));
    expect(new Date(start).getHours()).toBe(0);
    expect(end - start).toBe(86_400_000);
  });

  it('keeps a late evening sale on the same local day', () => {
    const evening = new Date(2026, 7, 3, 22, 0).getTime();
    expect(isSameDay(evening, new Date(2026, 7, 3, 8, 0))).toBe(true);
  });
});

describe('dailyRecap', () => {
  it('counts only completed sales in the takings', () => {
    const r = dailyRecap({
      sales: [sale(), sale({ id: 's2', status: 'batal' })],
    });
    expect(r.transaksi).toBe(1);
    expect(r.batal).toBe(1);
    expect(r.penjualan).toBe(26000);
  });

  it('splits new debt from cash actually received', () => {
    const r = dailyRecap({
      sales: [sale({ payment: { method: 'utang', paid: 6000 } })],
    });
    expect(r.tunai).toBe(6000);
    expect(r.utangBaru).toBe(20000);
  });

  it('reports profit as null when any item has no cost, rather than a wrong number', () => {
    const linesBySale = new Map([['s1', [line({ cost: null })]]]);
    expect(dailyRecap({ sales: [sale()], linesBySale }).laba).toBeNull();
  });

  it('sums profit when every line carries a cost', () => {
    const linesBySale = new Map([['s1', [line({ price: 12000, cost: 8000, qty: 2 })]]]);
    expect(dailyRecap({ sales: [sale()], linesBySale }).laba).toBe(8000);
  });

  it('counts utang repayments separately from sales', () => {
    const r = dailyRecap({
      sales: [],
      ledger: [{ type: 'bayar', amount: 15000 }, { type: 'utang', amount: 5000 }],
    });
    expect(r.pembayaranUtang).toBe(15000);
    expect(r.penjualan).toBe(0);
  });

  it('handles a day with no sales at all', () => {
    const r = dailyRecap({});
    expect(r).toMatchObject({ transaksi: 0, penjualan: 0, utangBaru: 0 });
  });
});

describe('bestSellers', () => {
  it('ranks by quantity across sales', () => {
    const lines = [
      line({ itemId: 'a', name: 'Teh', qty: 5, price: 3000 }),
      line({ itemId: 'b', name: 'Gorengan', qty: 12, price: 1000 }),
      line({ itemId: 'a', name: 'Teh', qty: 2, price: 3000 }),
    ];
    const top = bestSellers(lines);
    expect(top[0]).toMatchObject({ itemId: 'b', qty: 12 });
    expect(top[1]).toMatchObject({ itemId: 'a', qty: 7, total: 21000 });
  });
});

describe('shiftSummary', () => {
  it('computes the expected drawer and the difference once counted', () => {
    const s = shiftSummary({ kasAwal: 100000, tunai: 450000, kasAkhir: 545000 });
    expect(s.seharusnya).toBe(550000);
    expect(s.selisih).toBe(-5000);
  });

  it('leaves the difference unknown until the drawer is counted', () => {
    expect(shiftSummary({ kasAwal: 100000, tunai: 450000 }).selisih).toBeNull();
  });

  // Without this the app reports a surplus every time a customer settles a tab,
  // because that cash is in the drawer but was never a sale today.
  it('counts utang repayments, which sit in the same drawer', () => {
    const s = shiftSummary({
      kasAwal: 100000,
      tunai: 450000,
      pembayaranUtang: 50000,
      kasAkhir: 600000,
    });
    expect(s.seharusnya).toBe(600000);
    expect(s.selisih).toBe(0);
  });
});

describe('cashTaken', () => {
  const sale = (over) => ({ total: 10000, payment: { method: 'tunai', paid: 10000 }, ...over });

  it('counts a cash sale for what was handed over, less the change', () => {
    expect(cashTaken([sale({ payment: { method: 'tunai', paid: 50000 } })])).toBe(10000);
  });

  // The drawer keeps the part payment, not the whole bill.
  it('counts a part-paid utang sale for what was actually paid', () => {
    expect(cashTaken([sale({ payment: { method: 'utang', paid: 4000 } })])).toBe(4000);
  });

  it('ignores money that never reached the drawer', () => {
    expect(cashTaken([sale({ payment: { method: 'transfer', paid: 10000 } })])).toBe(0);
  });
});

describe('expenses', () => {
  const spent = (over) => ({ amount: 5000, dariLaci: true, status: 'selesai', ...over });

  it('ignores cancelled entries, which stay in the table as evidence', () => {
    expect(expenseTotal([spent(), spent({ status: 'batal' })])).toBe(5000);
  });

  // A bill paid by transfer is money gone, but it never sat in the till, so
  // subtracting it at closing would invent a shortfall.
  it('separates what left the drawer from what was merely spent', () => {
    const rows = [spent(), spent({ amount: 20000, dariLaci: false })];
    expect(expenseTotal(rows)).toBe(25000);
    expect(expenseFromDrawer(rows)).toBe(5000);
  });

  it('takes what was spent off the drawer the shift has to account for', () => {
    const s = shiftSummary({
      kasAwal: 100000,
      tunai: 450000,
      pengeluaran: 50000,
      kasAkhir: 500000,
    });
    expect(s.seharusnya).toBe(500000);
    expect(s.selisih).toBe(0);
  });

  it('takes it off the margin too, and says so as a loss when it is one', () => {
    const recap = dailyRecap({
      sales: [sale()],
      linesBySale: new Map([['s1', [line({ cost: 8000 })]]]),
      expenses: [spent({ amount: 100000 })],
    });
    expect(recap.pengeluaran).toBe(100000);
    expect(recap.sisa).toBe(recap.laba - 100000);
    expect(recap.sisa).toBeLessThan(0);
  });

  // Selling at an unknown margin and then spending is not a number anyone can
  // stand behind, so it is withheld rather than approximated.
  it('withholds the net when any item has no cost price', () => {
    const recap = dailyRecap({
      sales: [sale()],
      linesBySale: new Map([['s1', [line({ cost: null })]]]),
      expenses: [spent()],
    });
    expect(recap.laba).toBeNull();
    expect(recap.sisa).toBeNull();
    expect(recap.pengeluaran).toBe(5000);
  });
});

describe('rangeBounds', () => {
  const siang = new Date('2026-08-18T13:00:00');

  it('gives back the single day when asked for one', () => {
    expect(rangeBounds(1, siang)).toEqual(dayBounds(siang));
  });

  // Seven days means today and the six before it, not today plus seven.
  it('counts today as the first of the days, not an extra one', () => {
    const { start, end } = rangeBounds(7, siang);
    expect(new Date(start).getDate()).toBe(12);
    expect(end).toBe(dayBounds(siang).end);
    expect(Math.round((end - start) / 86400000)).toBe(7);
  });

  it('crosses a month boundary without arithmetic of its own', () => {
    const { start } = rangeBounds(7, new Date('2026-09-02T10:00:00'));
    expect(new Date(start).getMonth()).toBe(7);
    expect(new Date(start).getDate()).toBe(27);
  });
});

describe('byDay', () => {
  const at = (iso, over = {}) => sale({ createdAt: new Date(iso).getTime(), ...over });

  it('groups by day, newest first, and counts the transactions', () => {
    const rows = byDay([
      at('2026-08-17T09:00:00'),
      at('2026-08-18T10:00:00'),
      at('2026-08-18T19:00:00'),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].transaksi).toBe(2);
    expect(rows[0].penjualan).toBe(52000);
    expect(rows[1].transaksi).toBe(1);
  });

  // An 8pm sale belongs to the day the shop was open, not to the next one in
  // UTC, which is where a naive boundary would file it.
  it('puts a late-evening sale on the day it was made', () => {
    const rows = byDay([at('2026-08-18T23:30:00')]);
    expect(new Date(rows[0].day).getDate()).toBe(18);
  });

  it('leaves cancelled sales out of the takings', () => {
    const rows = byDay([at('2026-08-18T10:00:00', { status: 'batal' })]);
    expect(rows).toHaveLength(0);
  });
});
