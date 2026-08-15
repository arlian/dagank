// A cash shift: kas awal counted into the drawer at open, kas akhir counted
// out of it at close, and the selisih between what is there and what should
// be. No network, like everything else here.
//
// A shift is a session envelope rather than a money movement, so closing it
// updates the row instead of appending a second one. The money records it
// summarises -- sales and ledger entries -- stay append-only and untouched,
// which is what keeps the figures reconstructable if a shift is ever closed
// with the wrong number in it.

import { db, newId, stamps, touch } from './db.js';
import { cashTaken } from '../domain/report.js';

/**
 * The shift still open, if any. There is at most one: the screen never offers
 * "buka kasir" while one is running.
 */
export async function currentShift() {
  const open = await db.shifts.filter((s) => !s.closedAt).toArray();
  return open.sort((a, b) => b.openedAt - a.openedAt)[0] ?? null;
}

export async function openShift(kasAwal = 0) {
  const running = await currentShift();
  if (running) return running;

  const shift = {
    id: newId(),
    openedAt: Date.now(),
    kasAwal,
    closedAt: null,
    kasAkhir: null,
    selisih: null,
    ...stamps(),
  };
  await db.shifts.add(shift);
  return shift;
}

/**
 * Closes at the counted figure. The selisih is stored alongside rather than
 * only derived, because it is the one number an owner goes back to look for
 * weeks later, and by then the sales it came from have scrolled far away.
 */
export async function closeShift(id, kasAkhir) {
  const shift = await db.shifts.get(id);
  if (!shift || shift.closedAt) return null;

  const closedAt = Date.now();
  const { seharusnya, selisih } = await shiftTotals({ ...shift, closedAt }, kasAkhir);

  await db.shifts.update(id, touch({ closedAt, kasAkhir, seharusnya, selisih }));
  return db.shifts.get(id);
}

/**
 * What the drawer took in while this shift was running.
 *
 * Bounded by time rather than by a shift id on each sale: sales are
 * append-only and were never stamped with one, and a time range gives the
 * same answer without rewriting history. It also survives a shift that runs
 * past midnight, which a warung malam does every night.
 */
export async function shiftTotals(shift, kasAkhir = null) {
  const until = shift.closedAt ?? Date.now();

  const sales = await db.sales
    .where('createdAt')
    .between(shift.openedAt, until, true, true)
    .toArray();

  const ledger = await db.ledger
    .where('createdAt')
    .between(shift.openedAt, until, true, true)
    .toArray();

  const selesai = sales.filter((s) => s.status === 'selesai');
  const tunai = cashTaken(selesai);
  const pembayaranUtang = ledger
    .filter((e) => e.type === 'bayar')
    .reduce((sum, e) => sum + e.amount, 0);

  const seharusnya = shift.kasAwal + tunai + pembayaranUtang;

  return {
    tunai,
    pembayaranUtang,
    transaksi: selesai.length,
    seharusnya,
    selisih: kasAkhir == null ? null : kasAkhir - seharusnya,
  };
}

/** Closed shifts, newest first, for the history list. */
export async function recentShifts(limit = 10) {
  const rows = await db.shifts.filter((s) => s.closedAt).toArray();
  return rows.sort((a, b) => b.openedAt - a.openedAt).slice(0, limit);
}
