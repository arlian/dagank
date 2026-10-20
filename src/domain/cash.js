// Pure cash helpers. No DOM, no Dexie, no Bluetooth.

/** Banknote values a customer is likely to hand over, smallest first. */
export const BILLS = [2000, 5000, 10000, 20000, 50000, 100000];

/**
 * The total rounded up to the next multiple of one bill. Zero when the total
 * is not a positive amount, since there is nothing to hand over.
 */
export function roundUpTo(total, bill) {
  if (!(total > 0) || !(bill > 0)) return 0;
  return Math.ceil(total / bill) * bill;
}

/**
 * Amounts worth offering as "uang diterima" for a total. Each bill rounds the
 * total up to what a customer would plausibly pay with it. The exact total is
 * left out because "Uang pas" already covers it.
 */
export function cashSuggestions(total, { bills = BILLS, limit = 4 } = {}) {
  const amounts = new Set();
  for (const bill of bills) {
    const amount = roundUpTo(total, bill);
    if (amount > total) amounts.add(amount);
  }
  return [...amounts].sort((a, b) => a - b).slice(0, limit);
}
