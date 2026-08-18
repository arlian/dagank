// Money going out. Without it the daily "untung" is only margin on goods, and
// an owner who buys plastic bags and pays for petrol out of the same drawer
// reads a profit they never had.
//
// Append-only, like every other money record here: a mistyped expense is
// cancelled by flipping its status, never by deleting the row, so the drawer
// figures of a closed day can always be reconstructed.

import { db, newId, stamps, touch } from './db.js';
import { dayBounds } from '../domain/report.js';

/**
 * Stored as keys, not as the words on screen. The labels live in the strings
 * module and can be reworded later without rewriting a shop's history.
 */
export const EXPENSE_CATEGORIES = [
  'belanja',
  'transport',
  'listrik',
  'gas',
  'sewa',
  'gaji',
  'pribadi',
  'lain',
];

export async function recordExpense({
  amount,
  category = 'lain',
  note = null,
  // Whether the money physically came out of the till. A bill paid by
  // transfer from the owner's own account is still an expense, but it must
  // not make the drawer come up short at closing.
  dariLaci = true,
}) {
  const value = Math.round(amount) || 0;
  if (value <= 0) throw new Error('jumlahKosong');

  const expense = {
    id: newId(),
    amount: value,
    category: EXPENSE_CATEGORIES.includes(category) ? category : 'lain',
    note: note?.trim() || null,
    dariLaci: !!dariLaci,
    status: 'selesai',
    voidedAt: null,
    ...stamps(),
  };

  await db.expenses.add(expense);
  return expense;
}

/** Cancelled, not erased. The row stays as evidence of what was entered. */
export async function voidExpense(id) {
  const expense = await db.expenses.get(id);
  if (!expense || expense.status === 'batal') return expense ?? null;

  await db.expenses.update(id, touch({ status: 'batal', voidedAt: Date.now() }));
  return db.expenses.get(id);
}

export const expensesOn = (date = new Date()) => {
  const { start, end } = dayBounds(date);
  return expensesBetween(start, end);
};

export const expensesBetween = (start, end, includeEnd = false) =>
  db.expenses.where('createdAt').between(start, end, true, includeEnd).toArray();
