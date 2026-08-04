// Pure sale arithmetic. No DOM, no Dexie, no Bluetooth.
//
// A sale line carries its own snapshot of name, unit, price, cost, and
// modifiers. A renamed or repriced item next month must not change last
// month's receipt or last month's margin.

import { roundingAdjustment } from './money.js';

/** Total of the chosen add-ons for one unit of the item. */
export const modifiersTotal = (modifiers) =>
  (modifiers ?? []).reduce((sum, m) => sum + (m.price || 0), 0);

/**
 * Line total, always an integer even when qty is fractional (weighed goods
 * priced per kg).
 */
export function lineSubtotal(line) {
  const unitPrice = (line.price || 0) + modifiersTotal(line.modifiers);
  return Math.round(unitPrice * (line.qty || 0));
}

/** Quantity expressed in the item's base unit. Stock only ever moves in base units. */
export const baseQty = (line) => (line.qty || 0) * (line.factor || 1);

/** Cost of goods for one line, using the cost snapshot taken at sale time. */
export const lineCost = (line) =>
  line.cost == null ? null : Math.round(line.cost * baseQty(line));

/**
 * Totals for a whole sale.
 * Invariant: subtotal - discount + rounding = total.
 */
export function calcSale({ lines = [], discount = 0, rounding = 'none' } = {}) {
  const subtotal = lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
  const capped = Math.min(Math.max(Math.round(discount) || 0, 0), subtotal);
  const afterDiscount = subtotal - capped;
  const adjustment = roundingAdjustment(afterDiscount, rounding);

  return {
    subtotal,
    discount: capped,
    rounding: adjustment,
    total: afterDiscount + adjustment,
  };
}

/** Gross profit, null when any line is missing a cost snapshot. */
export function grossProfit(lines = []) {
  let profit = 0;
  for (const line of lines) {
    const cost = lineCost(line);
    if (cost == null) return null;
    profit += lineSubtotal(line) - cost;
  }
  return profit;
}

/** Change owed to the customer. Never negative: a short payment is utang. */
export const changeDue = (total, paid) => Math.max((paid || 0) - total, 0);

/** How much of the total is still owed after this payment. */
export const outstanding = (total, paid) => Math.max(total - (paid || 0), 0);

/**
 * Add an item to the running lines. Tapping the same tile again increments
 * quantity rather than opening a modal, so lines merge when the item, unit,
 * and chosen modifiers all match.
 */
export function addLine(lines, line, qty = 1) {
  const key = lineKey(line);
  const index = lines.findIndex((l) => lineKey(l) === key);
  if (index === -1) return [...lines, { ...line, qty }];

  const next = [...lines];
  next[index] = { ...next[index], qty: next[index].qty + qty };
  return next;
}

export function setLineQty(lines, index, qty) {
  if (qty <= 0) return lines.filter((_, i) => i !== index);
  return lines.map((l, i) => (i === index ? { ...l, qty } : l));
}

function lineKey(line) {
  const mods = (line.modifiers ?? [])
    .map((m) => m.name)
    .sort()
    .join('|');
  return `${line.itemId}::${line.unit ?? ''}::${mods}`;
}
