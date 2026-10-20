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
