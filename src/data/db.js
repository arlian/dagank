// The device is the database. Nothing in this folder may await the network.

import Dexie from 'dexie';
import { monotonicFactory } from 'ulid';

export const db = new Dexie('kasir');

// Index only what is actually queried. Every index costs write time on a
// cheap phone. These cover the real access patterns: barcode lookup at the
// till, item search by name, grid loads by category, sales for a date range,
// movements for one item, movements for one sale when voiding, and the
// ledger for one customer.
db.version(1).stores({
  meta: 'key',
  items: 'id, barcode, name, category, deletedAt',
  sales: 'id, createdAt, customerId, status',
  saleLines: 'id, saleId, itemId',
  movements: 'id, itemId, createdAt, type, saleId',
  customers: 'id, name, deletedAt',
  ledger: 'id, customerId, createdAt, saleId',
  shifts: 'id, openedAt',
});

export const SCHEMA_VERSION = 1;

/**
 * IDs are generated here, never by a server. ULIDs sort by creation time.
 *
 * Monotonic, because a plain ULID only orders correctly across milliseconds:
 * two written inside the same one get independent random tails and can come
 * back in either order. Two movements on one item land in the same
 * millisecond easily, and their order is the whole story a stock history
 * tells, so the tail is made to increment instead.
 */
const nextId = monotonicFactory();

export const newId = () => nextId();

/** Stamped on every record so a later merge has something to work with. */
export const stamps = () => {
  const now = Date.now();
  return { createdAt: now, updatedAt: now, deletedAt: null };
};

export const touch = (patch = {}) => ({ ...patch, updatedAt: Date.now() });

export const TABLES = [
  'meta',
  'items',
  'sales',
  'saleLines',
  'movements',
  'customers',
  'ledger',
  'shifts',
];

/**
 * Ask the browser to keep the database. Without this a phone under storage
 * pressure can evict a shop's entire history.
 */
export async function requestDurableStorage() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
}

export const getMeta = async (key, fallback = null) =>
  (await db.meta.get(key))?.value ?? fallback;

export const setMeta = (key, value) =>
  db.meta.put({ key, value, updatedAt: Date.now() });
