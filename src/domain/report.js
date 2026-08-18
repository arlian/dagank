// Daily recap. For high-volume low-value sellers this is the only screen
// they open besides Kasir, so it has to be right and it has to be cheap.

import { grossProfit, lineSubtotal } from './sale.js';

/**
 * Day boundaries in the device timezone, typically Asia/Jakarta. A UTC
 * boundary puts an 8pm sale on the wrong day.
 */
export function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export const isSameDay = (timestamp, date = new Date()) => {
  const { start, end } = dayBounds(date);
  return timestamp >= start && timestamp < end;
};

/**
 * Cash that physically entered the drawer from these sales.
 *
 * A part-paid utang sale counts for what was handed over, not for its total,
 * and never for more: a customer who overpays gets change, so the drawer only
 * keeps the bill. This is the rule the daily recap and the shift close both
 * rest on, so it lives in one place.
 */
export const cashTaken = (sales = []) =>
  sales
    .filter((s) => s.payment?.method === 'tunai' || s.payment?.method === 'utang')
    .reduce((sum, s) => sum + Math.min(s.payment?.paid ?? 0, s.total), 0);

/** What was spent, cancelled entries excluded. */
export const expenseTotal = (expenses = []) =>
  expenses
    .filter((e) => e.status !== 'batal')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

/** Only the part of it that left the drawer, which is what closing counts. */
export const expenseFromDrawer = (expenses = []) =>
  expenseTotal(expenses.filter((e) => e.dariLaci !== false));

/**
 * The recap an owner actually wants. `sales` are the completed and voided
 * sales of the day; `linesBySale` maps a sale id to its lines.
 */
export function dailyRecap({
  sales = [],
  linesBySale = new Map(),
  ledger = [],
  expenses = [],
} = {}) {
  const done = sales.filter((s) => s.status === 'selesai');

  let penjualan = 0;
  let tunai = 0;
  let nonTunai = 0;
  let utangBaru = 0;
  let laba = 0;
  let labaKnown = true;

  for (const sale of done) {
    penjualan += sale.total;

    const paid = Math.min(sale.payment?.paid ?? 0, sale.total);
    if (sale.payment?.method === 'tunai') tunai += paid;
    else if (sale.payment?.method === 'utang') tunai += paid;
    else nonTunai += paid;

    if (sale.payment?.method === 'utang') utangBaru += sale.total - paid;

    const profit = grossProfit(linesBySale.get(sale.id) ?? []);
    if (profit == null) labaKnown = false;
    else laba += profit;
  }

  const pembayaranUtang = ledger
    .filter((e) => e.type === 'bayar')
    .reduce((sum, e) => sum + e.amount, 0);

  const pengeluaran = expenseTotal(expenses);

  return {
    transaksi: done.length,
    batal: sales.length - done.length,
    penjualan,
    tunai,
    nonTunai,
    utangBaru,
    pembayaranUtang,
    laba: labaKnown ? laba : null,
    pengeluaran,
    // What is actually left. Null whenever the margin is unknown, because
    // "penjualan minus pengeluaran" is not profit and showing it as one would
    // flatter the shop by exactly the cost of its goods.
    sisa: labaKnown ? laba - pengeluaran : null,
  };
}

/** Best sellers, by quantity sold, already sorted. */
export function bestSellers(lines = [], limit = 5) {
  const map = new Map();
  for (const line of lines) {
    const entry = map.get(line.itemId) ?? {
      itemId: line.itemId,
      name: line.name,
      qty: 0,
      total: 0,
    };
    entry.qty += line.qty || 0;
    entry.total += lineSubtotal(line);
    map.set(line.itemId, entry);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
}

/**
 * Expected cash in the drawer at close, and the selisih once counted.
 *
 * Utang repayments are counted separately from sales but sit in the same
 * drawer, so leaving them out would report a surplus every time a customer
 * settled a tab. Money taken out of that same drawer to buy something is
 * subtracted for the mirror-image reason: without it every shopping run
 * reports a shortfall and the selisih stops meaning anything.
 */
export function shiftSummary({
  kasAwal = 0,
  tunai = 0,
  pembayaranUtang = 0,
  pengeluaran = 0,
  kasAkhir = null,
} = {}) {
  const seharusnya = kasAwal + tunai + pembayaranUtang - pengeluaran;
  return {
    kasAwal,
    tunai,
    pembayaranUtang,
    pengeluaran,
    seharusnya,
    kasAkhir,
    selisih: kasAkhir == null ? null : kasAkhir - seharusnya,
  };
}
