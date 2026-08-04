import { describe, expect, it } from 'vitest';
import {
  currentStock,
  movementsForSale,
  opnameMovement,
  reversalMovements,
  stockAfterCart,
  stockByItem,
  stockWarning,
} from './stock.js';

const line = (over = {}) => ({
  itemId: 'itm1',
  qty: 1,
  factor: 1,
  trackStock: true,
  ...over,
});

describe('movementsForSale', () => {
  it('writes a negative movement in base units', () => {
    const [m] = movementsForSale([line({ qty: 3 })], 'sale1');
    expect(m).toMatchObject({ itemId: 'itm1', type: 'sale', qty: -3, saleId: 'sale1' });
  });

  it('converts a bulk unit into base units', () => {
    const [m] = movementsForSale([line({ qty: 2, factor: 24 })], 'sale1');
    expect(m.qty).toBe(-48);
  });

  it('ignores items with trackStock off, read per item not per shop', () => {
    const lines = [line({ trackStock: false }), line({ itemId: 'itm2' })];
    const movements = movementsForSale(lines, 'sale1');
    expect(movements).toHaveLength(1);
    expect(movements[0].itemId).toBe('itm2');
  });
});

describe('reversalMovements', () => {
  it('puts the goods back with an opposite record, leaving the original alone', () => {
    const original = movementsForSale([line({ qty: 3 })], 'sale1');
    const reversed = reversalMovements(original, 'sale2');

    expect(reversed[0]).toMatchObject({ type: 'reversal', qty: 3, saleId: 'sale2' });
    expect(original[0].qty).toBe(-3);
    expect(currentStock([...original, ...reversed])).toBe(0);
  });
});

describe('currentStock', () => {
  it('derives stock by summing movements', () => {
    const movements = [{ qty: 100 }, { qty: -3 }, { qty: -7 }];
    expect(currentStock(movements)).toBe(90);
  });

  it('allows negative stock, since the shop sells what is on the shelf', () => {
    expect(currentStock([{ qty: 2 }, { qty: -5 }])).toBe(-3);
  });

  it('is zero for an item that has never moved', () => {
    expect(currentStock([])).toBe(0);
  });
});

describe('stockByItem', () => {
  it('groups movements per item', () => {
    const map = stockByItem([
      { itemId: 'a', qty: 10 },
      { itemId: 'b', qty: 4 },
      { itemId: 'a', qty: -3 },
    ]);
    expect(map.get('a')).toBe(7);
    expect(map.get('b')).toBe(4);
  });
});

describe('opnameMovement', () => {
  it('records the difference and keeps the counted and believed figures', () => {
    const m = opnameMovement('itm1', 47, 50);
    expect(m).toMatchObject({ type: 'adjustment', qty: -3, counted: 47, previous: 50 });
  });
});

describe('stockWarning', () => {
  it('says nothing for an item that does not track stock', () => {
    expect(stockWarning({ trackStock: false }, -5)).toBeNull();
  });

  it('warns when empty or running low', () => {
    expect(stockWarning({ trackStock: true }, 0)).toBe('habis');
    expect(stockWarning({ trackStock: true, minStock: 5 }, 4)).toBe('menipis');
    expect(stockWarning({ trackStock: true, minStock: 5 }, 20)).toBeNull();
  });

  it('separates "oversold" from "empty", since they need different words', () => {
    expect(stockWarning({ trackStock: true }, -2)).toBe('kurang');
  });
});

describe('stockAfterCart', () => {
  const stock = () => new Map([['itm1', 3]]);

  it('subtracts what is already in the running cart', () => {
    const left = stockAfterCart(stock(), [line({ qty: 2 })]);
    expect(left.get('itm1')).toBe(1);
  });

  // The bug this exists to prevent: three in stock, five added, and the till
  // stayed silent because stored stock was still 3.
  it('warns as soon as the cart exceeds the shelf, not on the next sale', () => {
    const left = stockAfterCart(stock(), [line({ qty: 5 })]);
    expect(left.get('itm1')).toBe(-2);
    expect(stockWarning({ trackStock: true }, left.get('itm1'))).toBe('kurang');
  });

  it('counts a bulk unit in base units', () => {
    const left = stockAfterCart(new Map([['itm1', 50]]), [
      line({ qty: 2, factor: 24 }),
    ]);
    expect(left.get('itm1')).toBe(2);
  });

  it('ignores lines for items that do not track stock', () => {
    const left = stockAfterCart(stock(), [line({ qty: 9, trackStock: false })]);
    expect(left.get('itm1')).toBe(3);
  });

  it('does not mutate the map it was given', () => {
    const original = stock();
    stockAfterCart(original, [line({ qty: 2 })]);
    expect(original.get('itm1')).toBe(3);
  });
});
