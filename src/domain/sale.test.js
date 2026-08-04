import { describe, expect, it } from 'vitest';
import {
  addLine,
  calcSale,
  changeDue,
  grossProfit,
  lineSubtotal,
  outstanding,
  setLineQty,
} from './sale.js';

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

describe('lineSubtotal', () => {
  it('multiplies price by quantity', () => {
    expect(lineSubtotal(line({ qty: 3 }))).toBe(36000);
  });

  it('adds modifiers per unit, not per line', () => {
    const l = line({ qty: 2, modifiers: [{ name: 'Telur', price: 3000 }] });
    expect(lineSubtotal(l)).toBe(30000);
  });

  it('stays an integer for weighed goods', () => {
    const l = line({ price: 13333, qty: 0.25 });
    expect(lineSubtotal(l)).toBe(3333);
    expect(Number.isInteger(lineSubtotal(l))).toBe(true);
  });
});

describe('calcSale', () => {
  it('holds the invariant subtotal - discount + rounding = total', () => {
    const r = calcSale({
      lines: [line({ qty: 2 }), line({ itemId: 'itm2', price: 3000 })],
      discount: 2000,
      rounding: 500,
    });
    expect(r.subtotal - r.discount + r.rounding).toBe(r.total);
  });

  it('rounds the total only, leaving line subtotals untouched', () => {
    const lines = [line({ price: 12340 })];
    const r = calcSale({ lines, rounding: 100 });
    expect(r.subtotal).toBe(12340);
    expect(r.total).toBe(12300);
  });

  it('caps a discount at the subtotal so a sale can never go negative', () => {
    const r = calcSale({ lines: [line()], discount: 999999 });
    expect(r.discount).toBe(12000);
    expect(r.total).toBe(0);
  });

  it('ignores a negative discount', () => {
    const r = calcSale({ lines: [line()], discount: -5000 });
    expect(r.discount).toBe(0);
    expect(r.total).toBe(12000);
  });

  it('handles an empty cart', () => {
    expect(calcSale({ lines: [] })).toEqual({
      subtotal: 0,
      discount: 0,
      rounding: 0,
      total: 0,
    });
  });
});

describe('grossProfit', () => {
  it('uses the cost snapshot in base units', () => {
    const lines = [line({ price: 12000, cost: 8000, qty: 2 })];
    expect(grossProfit(lines)).toBe(8000);
  });

  it('is null when any line has no cost, rather than reporting a wrong margin', () => {
    const lines = [line({ cost: 8000 }), line({ itemId: 'itm2', cost: null })];
    expect(grossProfit(lines)).toBeNull();
  });

  it('accounts for the unit factor on a bulk unit', () => {
    // one dus of 24, cost is per base unit
    const lines = [line({ price: 60000, cost: 2000, qty: 1, factor: 24 })];
    expect(grossProfit(lines)).toBe(12000);
  });
});

describe('payment', () => {
  it('gives change when the customer overpays', () => {
    expect(changeDue(26000, 50000)).toBe(24000);
  });

  it('never returns negative change; a short payment is utang', () => {
    expect(changeDue(26000, 20000)).toBe(0);
    expect(outstanding(26000, 20000)).toBe(6000);
  });
});

describe('addLine', () => {
  it('merges a repeat tap into quantity instead of adding a second line', () => {
    const lines = addLine(addLine([], line()), line());
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(2);
  });

  it('keeps lines separate when the modifiers differ', () => {
    const plain = line();
    const withEgg = line({ modifiers: [{ name: 'Telur', price: 3000 }] });
    const lines = addLine(addLine([], plain), withEgg);
    expect(lines).toHaveLength(2);
  });

  it('merges regardless of the order modifiers were chosen', () => {
    const a = line({ modifiers: [{ name: 'Telur' }, { name: 'Pedas' }] });
    const b = line({ modifiers: [{ name: 'Pedas' }, { name: 'Telur' }] });
    expect(addLine(addLine([], a), b)).toHaveLength(1);
  });

  it('keeps lines separate when the unit differs', () => {
    const pcs = line({ unit: 'pcs' });
    const dus = line({ unit: 'dus', factor: 24 });
    expect(addLine(addLine([], pcs), dus)).toHaveLength(2);
  });
});

describe('setLineQty', () => {
  it('removes the line when quantity reaches zero', () => {
    const lines = [line(), line({ itemId: 'itm2' })];
    expect(setLineQty(lines, 0, 0)).toHaveLength(1);
  });

  it('does not mutate the array it was given', () => {
    const lines = [line()];
    setLineQty(lines, 0, 5);
    expect(lines[0].qty).toBe(1);
  });
});
