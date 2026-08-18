// Recording a sale writes the sale, its lines, its stock movements, and any
// ledger entry in one transaction, so a tab killed mid-write can never leave
// a sale without its lines.

import { db, newId, stamps, touch } from './db.js';
import { calcSale } from '../domain/sale.js';
import { movementsForSale, reversalMovements } from '../domain/stock.js';
import { dayBounds } from '../domain/report.js';

/**
 * A line snapshots name, unit, price, cost, and modifiers at the moment of
 * sale. Renaming or repricing an item next month must not rewrite last
 * month's receipt or last month's margin.
 */
export const lineFromItem = (item, { unit = null, modifiers = [], qty = 1 } = {}) => {
  const chosen = item.units?.find((u) => u.name === unit);
  return {
    itemId: item.id,
    name: item.name,
    unit: chosen?.name ?? item.unit ?? null,
    factor: chosen?.factor ?? 1,
    price: chosen?.price ?? item.price,
    cost: item.cost ?? null,
    trackStock: !!item.trackStock,
    modifiers,
    qty,
  };
};

/**
 * @param payment {{ method: 'tunai'|'qris'|'transfer'|'utang', paid: number }}
 */
export async function recordSale({
  lines,
  discount = 0,
  rounding = 'none',
  payment,
  customerId = null,
  note = null,
}) {
  if (!lines?.length) throw new Error('Tidak ada barang');

  const totals = calcSale({ lines, discount, rounding });
  const saleId = newId();
  const now = Date.now();

  const sale = {
    id: saleId,
    ...totals,
    status: 'selesai',
    payment: {
      method: payment.method,
      paid: Math.round(payment.paid ?? 0),
      change: Math.max((payment.paid ?? 0) - totals.total, 0),
    },
    customerId,
    note,
    voidedAt: null,
    ...stamps(),
    createdAt: now,
  };

  const saleLines = lines.map((line) => ({ ...line, id: newId(), saleId, ...stamps() }));

  const movements = movementsForSale(lines, saleId).map((m) => ({
    ...m,
    id: newId(),
    ...stamps(),
  }));

  const unpaid = totals.total - sale.payment.paid;
  const ledgerEntry =
    payment.method === 'utang' && unpaid > 0 && customerId
      ? {
          id: newId(),
          customerId,
          type: 'utang',
          amount: unpaid,
          saleId,
          note: null,
          ...stamps(),
        }
      : null;

  await db.transaction(
    'rw',
    db.sales,
    db.saleLines,
    db.movements,
    db.ledger,
    async () => {
      await db.sales.add(sale);
      await db.saleLines.bulkAdd(saleLines);
      if (movements.length) await db.movements.bulkAdd(movements);
      if (ledgerEntry) await db.ledger.add(ledgerEntry);
    },
  );

  return sale;
}

/**
 * Voiding never edits or deletes the money. The recorded totals, lines, and
 * prices are evidence and stay exactly as written; the correction is a set of
 * appended reversing movements and a reversing ledger entry. Only `status`
 * flips, so the sale drops out of the day's takings.
 */
export async function voidSale(saleId, reason = null) {
  const sale = await db.sales.get(saleId);
  if (!sale) throw new Error('Transaksi tidak ditemukan');
  if (sale.status === 'batal') return sale;

  const original = await db.movements.where('saleId').equals(saleId).toArray();
  const reversals = reversalMovements(original, saleId).map((m) => ({
    ...m,
    id: newId(),
    note: reason,
    ...stamps(),
  }));

  const debt = await db.ledger.where('saleId').equals(saleId).toArray();
  const reversingLedger = debt
    .filter((e) => e.type === 'utang')
    .map((e) => ({
      id: newId(),
      customerId: e.customerId,
      type: 'bayar',
      amount: e.amount,
      saleId,
      note: reason ?? 'Transaksi dibatalkan',
      ...stamps(),
    }));

  await db.transaction('rw', db.sales, db.movements, db.ledger, async () => {
    await db.sales.update(saleId, touch({ status: 'batal', voidedAt: Date.now() }));
    if (reversals.length) await db.movements.bulkAdd(reversals);
    if (reversingLedger.length) await db.ledger.bulkAdd(reversingLedger);
  });

  return db.sales.get(saleId);
}

export const salesOn = (date = new Date()) => {
  const { start, end } = dayBounds(date);
  return salesBetween(start, end);
};

export const salesBetween = (start, end) =>
  db.sales.where('createdAt').between(start, end, true, false).toArray();

export const linesForSales = async (saleIds) => {
  const ids = new Set(saleIds);
  const lines = await db.saleLines.filter((l) => ids.has(l.saleId)).toArray();
  const map = new Map();
  for (const line of lines) {
    if (!map.has(line.saleId)) map.set(line.saleId, []);
    map.get(line.saleId).push(line);
  }
  return map;
};

export const linesForSale = (saleId) =>
  db.saleLines.where('saleId').equals(saleId).toArray();

export const recentSales = (limit = 20) =>
  db.sales.orderBy('createdAt').reverse().limit(limit).toArray();
