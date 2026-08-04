// Backup is the most important feature in an app with no server, and the one
// most likely to be postponed. It is not postponed.

import { db, setMeta, getMeta, SCHEMA_VERSION, TABLES } from './db.js';
import { tanggal } from '../strings/id.js';

const REMINDER_AFTER = 7 * 86_400_000;

export async function buildBackup() {
  const data = {};
  for (const table of TABLES) {
    data[table] = await db.table(table).toArray();
  }
  return {
    app: 'kasir-umkm',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    data,
  };
}

const filename = () =>
  `kasir-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;

/**
 * Offered through the Web Share API so the owner can send it to their own
 * WhatsApp or save it to Drive, with a plain download as fallback.
 */
export async function exportBackup() {
  const backup = await buildBackup();
  const json = JSON.stringify(backup);
  const file = new File([json], filename(), { type: 'application/json' });

  let shared = false;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Cadangan Kasir' });
      shared = true;
    } catch (err) {
      if (err?.name === 'AbortError') return { shared: false, cancelled: true };
    }
  }

  if (!shared) download(new Blob([json], { type: 'application/json' }), filename());

  await setMeta('lastExportAt', Date.now());
  return { shared, cancelled: false };
}

/**
 * Replaces everything or refuses clearly. No clever merge: "ganti semua data
 * dari file ini" is understandable, a silent partial merge is not.
 */
export async function importBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('fileSalah');
  }

  if (backup?.app !== 'kasir-umkm' || !backup.data) throw new Error('fileSalah');
  if (backup.schemaVersion > SCHEMA_VERSION) throw new Error('versiSalah');

  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const table of TABLES) {
      await db.table(table).clear();
      const rows = backup.data[table];
      if (rows?.length) await db.table(table).bulkAdd(rows);
    }
  });

  return { restoredAt: backup.exportedAt };
}

/** Owners who do keep records keep them in Excel. */
export async function exportItemsCsv() {
  const items = await db.items.filter((i) => !i.deletedAt).sortBy('name');
  const rows = [
    ['Nama', 'Kategori', 'Barcode', 'Harga', 'Modal', 'Catat stok'],
    ...items.map((i) => [
      i.name,
      i.category ?? '',
      i.barcode ?? '',
      i.price,
      i.cost ?? '',
      i.trackStock ? 'ya' : 'tidak',
    ]),
  ];
  download(csvBlob(rows), `barang-${Date.now()}.csv`);
}

export async function exportSalesCsv() {
  const sales = await db.sales.orderBy('createdAt').toArray();
  const lines = await db.saleLines.toArray();
  const bySale = new Map();
  for (const line of lines) {
    if (!bySale.has(line.saleId)) bySale.set(line.saleId, []);
    bySale.get(line.saleId).push(line);
  }

  const rows = [['Tanggal', 'Transaksi', 'Barang', 'Jumlah', 'Harga', 'Total', 'Status']];
  for (const sale of sales) {
    for (const line of bySale.get(sale.id) ?? []) {
      rows.push([
        tanggal(sale.createdAt),
        sale.id,
        line.name,
        line.qty,
        line.price,
        Math.round(line.price * line.qty),
        sale.status,
      ]);
    }
  }
  download(csvBlob(rows), `penjualan-${Date.now()}.csv`);
}

export const lastExportAt = () => getMeta('lastExportAt', null);

export async function needsBackupReminder() {
  const last = await lastExportAt();
  const hasSales = (await db.sales.count()) > 0;
  if (!hasSales) return false;
  return !last || Date.now() - last > REMINDER_AFTER;
}

function csvBlob(rows) {
  const escape = (cell) => {
    const value = String(cell ?? '');
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  // BOM so Excel reads the accented characters correctly.
  const csv = '﻿' + rows.map((r) => r.map(escape).join(',')).join('\r\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
