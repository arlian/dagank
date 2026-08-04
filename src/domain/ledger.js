// Utang / kasbon. The balance is always derived by summing the ledger,
// never stored as a mutable field that can drift.
//
// Repayments are recorded against the customer, not against a specific sale,
// because real shops pay down a running balance.

export const LEDGER_TYPES = ['utang', 'bayar'];

/** A new debt from a sale that was not fully paid. */
export const debtEntry = (customerId, amount, saleId) => ({
  customerId,
  type: 'utang',
  amount: Math.round(amount),
  saleId,
  note: null,
});

/** A repayment against the running balance. */
export const paymentEntry = (customerId, amount, note = null) => ({
  customerId,
  type: 'bayar',
  amount: Math.round(amount),
  saleId: null,
  note,
});

/** What one customer still owes. Negative means they have paid ahead. */
export const balance = (entries = []) =>
  entries.reduce(
    (sum, e) => sum + (e.type === 'bayar' ? -e.amount : e.amount),
    0,
  );

/** Balances for every customer with any ledger entry. */
export function balanceByCustomer(entries = []) {
  const map = new Map();
  for (const e of entries) {
    const delta = e.type === 'bayar' ? -e.amount : e.amount;
    map.set(e.customerId, (map.get(e.customerId) ?? 0) + delta);
  }
  return map;
}

/** Age in whole days of the oldest unpaid debt, oldest-first FIFO against payments. */
export function oldestDebtAge(entries = [], now = Date.now()) {
  const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  let credit = sorted
    .filter((e) => e.type === 'bayar')
    .reduce((sum, e) => sum + e.amount, 0);

  for (const entry of sorted) {
    if (entry.type !== 'utang') continue;
    if (credit >= entry.amount) {
      credit -= entry.amount;
      continue;
    }
    return Math.floor((now - entry.createdAt) / 86_400_000);
  }
  return null;
}
