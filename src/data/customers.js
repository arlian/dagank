// Customers and their utang. Balances are always derived by summing the
// ledger, never stored as a field that can drift out of step.

import { db, newId, stamps, touch } from './db.js';
import { balance, balanceByCustomer, oldestDebtAge } from '../domain/ledger.js';

const alive = (row) => !row.deletedAt;

export const listCustomers = () => db.customers.filter(alive).sortBy('name');

export const getCustomer = (id) => db.customers.get(id);

export async function createCustomer({ name, phone = null, note = null }) {
  const customer = { id: newId(), name: name.trim(), phone, note, ...stamps() };
  await db.customers.add(customer);
  return customer;
}

export const updateCustomer = (id, patch) => db.customers.update(id, touch(patch));

export const deleteCustomer = (id) =>
  db.customers.update(id, touch({ deletedAt: Date.now() }));

export const entriesFor = (customerId) =>
  db.ledger.where('customerId').equals(customerId).sortBy('createdAt');

export const balanceFor = async (customerId) => balance(await entriesFor(customerId));

/** Every customer with an outstanding balance, largest first. */
export async function outstandingCustomers() {
  const [customers, ledger] = await Promise.all([
    listCustomers(),
    db.ledger.toArray(),
  ]);
  const balances = balanceByCustomer(ledger);
  const byCustomer = new Map();
  for (const entry of ledger) {
    if (!byCustomer.has(entry.customerId)) byCustomer.set(entry.customerId, []);
    byCustomer.get(entry.customerId).push(entry);
  }

  return customers
    .map((c) => ({
      ...c,
      balance: balances.get(c.id) ?? 0,
      age: oldestDebtAge(byCustomer.get(c.id) ?? []),
    }))
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance);
}

/** A repayment against the running balance, not against one specific sale. */
export async function recordPayment(customerId, amount, note = null) {
  const entry = {
    id: newId(),
    customerId,
    type: 'bayar',
    amount: Math.round(amount),
    saleId: null,
    note,
    ...stamps(),
  };
  await db.ledger.add(entry);
  return entry;
}
