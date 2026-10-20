import { describe, expect, it } from 'vitest';
import { cashSuggestions, roundUpTo } from './cash.js';

describe('roundUpTo', () => {
  it('rounds up to the next multiple of the bill', () => {
    expect(roundUpTo(37500, 10000)).toBe(40000);
    expect(roundUpTo(37500, 2000)).toBe(38000);
  });

  it('keeps a total that already sits on the bill', () => {
    expect(roundUpTo(40000, 10000)).toBe(40000);
  });
});

describe('cashSuggestions', () => {
  it('offers distinct amounts above the total, smallest first', () => {
    expect(cashSuggestions(37500)).toEqual([38000, 40000, 50000, 100000]);
  });

  it('leaves out the exact total, which Uang pas covers', () => {
    expect(cashSuggestions(50000)).not.toContain(50000);
    expect(cashSuggestions(50000)).toEqual([60000, 100000]);
  });
});

describe('cashSuggestions edge cases', () => {
  it('suggests nothing for an empty or negative total', () => {
    expect(cashSuggestions(0)).toEqual([]);
    expect(cashSuggestions(-5000)).toEqual([]);
  });

  it('respects the limit', () => {
    expect(cashSuggestions(37500, { limit: 2 })).toEqual([38000, 40000]);
  });

  it('always yields integers', () => {
    for (const amount of cashSuggestions(12345)) {
      expect(Number.isInteger(amount)).toBe(true);
    }
  });
});
