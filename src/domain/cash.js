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
