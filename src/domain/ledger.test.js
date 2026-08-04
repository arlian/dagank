import { describe, expect, it } from 'vitest';
import { balance, balanceByCustomer, debtEntry, oldestDebtAge, paymentEntry } from './ledger.js';

const DAY = 86_400_000;

describe('balance', () => {
  it('adds debts and subtracts repayments', () => {
    const entries = [
      debtEntry('c1', 26000, 'sale1'),
      debtEntry('c1', 14000, 'sale2'),
      paymentEntry('c1', 20000),
    ];
    expect(balance(entries)).toBe(20000);
  });

  it('goes negative when a customer pays ahead', () => {
    expect(balance([debtEntry('c1', 10000), paymentEntry('c1', 15000)])).toBe(-5000);
  });

  it('is zero for a customer with no entries', () => {
    expect(balance([])).toBe(0);
  });
});

describe('balanceByCustomer', () => {
  it('keeps customers separate', () => {
    const map = balanceByCustomer([
      debtEntry('c1', 10000),
      debtEntry('c2', 5000),
      paymentEntry('c1', 4000),
    ]);
    expect(map.get('c1')).toBe(6000);
    expect(map.get('c2')).toBe(5000);
  });
});

describe('oldestDebtAge', () => {
  const now = Date.now();

  it('reports the age of the oldest debt still unpaid', () => {
    const entries = [
      { ...debtEntry('c1', 10000), createdAt: now - 30 * DAY },
      { ...debtEntry('c1', 5000), createdAt: now - 3 * DAY },
    ];
    expect(oldestDebtAge(entries, now)).toBe(30);
  });

  it('applies repayments oldest first', () => {
    const entries = [
      { ...debtEntry('c1', 10000), createdAt: now - 30 * DAY },
      { ...debtEntry('c1', 5000), createdAt: now - 3 * DAY },
      { ...paymentEntry('c1', 10000), createdAt: now - 1 * DAY },
    ];
    expect(oldestDebtAge(entries, now)).toBe(3);
  });

  it('is null once everything is settled', () => {
    const entries = [
      { ...debtEntry('c1', 10000), createdAt: now - 30 * DAY },
      { ...paymentEntry('c1', 10000), createdAt: now - 1 * DAY },
    ];
    expect(oldestDebtAge(entries, now)).toBeNull();
  });
});
