import { describe, expect, it } from 'vitest';
import { angka, parseRupiah, roundingAdjustment, rupiah } from './money.js';

describe('formatting', () => {
  it('formats rupiah with id-ID separators and no decimals', () => {
    expect(rupiah(12500)).toBe('Rp12.500');
    expect(rupiah(0)).toBe('Rp0');
    expect(rupiah(1000000)).toBe('Rp1.000.000');
  });

  it('formats a bare number for fields that already show Rp', () => {
    expect(angka(12500)).toBe('12.500');
  });
});

describe('parseRupiah', () => {
  it('reads back what the formatter wrote', () => {
    expect(parseRupiah('12.500')).toBe(12500);
    expect(parseRupiah('Rp12.500')).toBe(12500);
  });

  it('is empty-safe, since the keypad starts blank', () => {
    expect(parseRupiah('')).toBe(0);
    expect(parseRupiah(null)).toBe(0);
    expect(parseRupiah(undefined)).toBe(0);
  });

  it('never produces a float from a typed separator', () => {
    expect(Number.isInteger(parseRupiah('1.500'))).toBe(true);
  });
});

describe('roundingAdjustment', () => {
  it('does nothing when rounding is off', () => {
    expect(roundingAdjustment(12345, 'none')).toBe(0);
  });

  it('returns the delta to the nearest step', () => {
    expect(roundingAdjustment(12340, 100)).toBe(-40);
    expect(roundingAdjustment(12360, 100)).toBe(40);
    expect(roundingAdjustment(12300, 500)).toBe(200);
  });

  it('is zero when the amount already sits on the step', () => {
    expect(roundingAdjustment(12500, 500)).toBe(0);
  });

  it('always yields an integer total', () => {
    for (const amount of [1, 33, 12345, 99999]) {
      expect(Number.isInteger(amount + roundingAdjustment(amount, 100))).toBe(true);
    }
  });
});
