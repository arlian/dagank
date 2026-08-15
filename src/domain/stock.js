// Stock movements are the truth; current stock is derived from them.
// Applies only to lines whose item has trackStock on. That flag is a
// property of the item, not of the shop: a warung makan counts bottled
// drinks and never counts portions of nasi goreng.

import { baseQty } from './sale.js';

export const MOVEMENT_TYPES = [
  'sale', // sold at the till
  'reversal', // a voided sale putting goods back
  'purchase', // barang masuk
  'adjustment', // stok opname
  'waste', // rusak or kadaluarsa
];

/**
 * Movements for the lines of one sale, in base units, negative because
 * goods left the shop. Lines for untracked items produce nothing.
 */
export function movementsForSale(lines = [], saleId) {
  return lines
    .filter((l) => l.trackStock)
    .map((l) => ({
      itemId: l.itemId,
      type: 'sale',
      qty: -baseQty(l),
      saleId,
      note: null,
    }));
}

/** Reversing movements for a voided sale. Never mutate or delete the originals. */
export function reversalMovements(movements = [], reversalSaleId) {
  return movements.map((m) => ({
    itemId: m.itemId,
    type: 'reversal',
    qty: -m.qty,
    saleId: reversalSaleId,
    note: null,
  }));
}

/** Barang masuk: a kulakan run arriving. Positive, goods entered the shop. */
export function purchaseMovement(itemId, qty, note = null) {
  return { itemId, type: 'purchase', qty, saleId: null, note };
}

/**
 * Rusak or kadaluarsa. Typed separately from a sale on purpose: both take
 * goods off the shelf, but only one of them brought money in, and a shop that
 * cannot tell them apart cannot see what it is losing.
 */
export function wasteMovement(itemId, qty, note = null) {
  return { itemId, type: 'waste', qty: -qty, saleId: null, note };
}

/**
 * A stok opname records what was counted, what the app believed, and the
 * difference, so shrinkage stays visible instead of being silently absorbed.
 */
export function opnameMovement(itemId, counted, previous) {
  return {
    itemId,
    type: 'adjustment',
    qty: counted - previous,
    counted,
    previous,
    saleId: null,
    note: null,
  };
}

/** Current stock for one item, derived. May be negative, and that is allowed. */
export const currentStock = (movements = []) =>
  movements.reduce((sum, m) => sum + (m.qty || 0), 0);

/** Current stock for every item that has any movement. */
export function stockByItem(movements = []) {
  const map = new Map();
  for (const m of movements) {
    map.set(m.itemId, (map.get(m.itemId) ?? 0) + (m.qty || 0));
  }
  return map;
}

/**
 * Stock left once the running cart is taken into account.
 *
 * The till has to warn on what the cart is about to do, not only on what the
 * shelf holds right now. Warning on stored stock alone is silent in exactly
 * the case that matters: three in stock, five added to the sale.
 */
export function stockAfterCart(stock, lines = []) {
  const left = new Map(stock);
  for (const line of lines) {
    if (!line.trackStock) continue;
    left.set(line.itemId, (left.get(line.itemId) ?? 0) - baseQty(line));
  }
  return left;
}

/**
 * The tracked items with their derived count, worst first.
 *
 * Alphabetical is the wrong order here. Someone opens this screen straight
 * after a kulakan run, holding a bag, looking for what ran out — so what ran
 * out goes at the top rather than wherever its name happens to fall.
 */
export function stockList(items = [], stock = new Map()) {
  const RANK = { kurang: 0, habis: 1, menipis: 2 };

  return items
    .filter((item) => item.trackStock)
    .map((item) => {
      const count = stock.get(item.id) ?? 0;
      return { item, count, warn: stockWarning(item, count) };
    })
    .sort(
      (a, b) =>
        (RANK[a.warn] ?? 3) - (RANK[b.warn] ?? 3) ||
        a.item.name.localeCompare(b.item.name, 'id'),
    );
}

/**
 * Stock may go negative: the shop sells what is physically there regardless
 * of what the app believes. Warn, never block.
 */
export function stockWarning(item, stock) {
  if (!item?.trackStock) return null;
  if (stock < 0) return 'kurang';
  if (stock === 0) return 'habis';
  if (item.minStock != null && stock <= item.minStock) return 'menipis';
  return null;
}
