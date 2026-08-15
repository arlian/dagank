// @vitest-environment jsdom
//
// The gap this covers: stock only ever moved out. Sales decremented it and
// nothing put it back, so a kelontong's count went wrong on its first kulakan
// run and stayed wrong. This drives the real screens through a restock, a
// waste write-off, and a stok opname.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { db, TABLES } from '../data/db.js';
import { createItem, stockFor } from '../data/items.js';
import { applyPreset } from '../data/settings.js';

const log = (step) => console.log(`  ${step}`);

let beras;

beforeEach(async () => {
  // No auto-cleanup is configured, so without this each test mounts another
  // App on top of the last one and every query goes ambiguous.
  cleanup();
  // The hash survives cleanup, so without this a test starts on whatever
  // screen the previous one navigated to.
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('kelontong', 'Toko Bu Ani');
  beras = await createItem(
    { name: 'Beras 1 kg', price: 13000, trackStock: true, minStock: 5 },
    { stokAwal: 3 },
  );
});

/**
 * The tab, not the "Barang masuk" chip or the "Tambah barang" button. Awaited,
 * because App renders nothing at all until the first settings read lands.
 */
const klikTab = async (user, name) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name }));
};

/**
 * Opens Barang, then the Stok sheet, then Beras. Scoped to the sheet, because
 * the Barang list underneath carries the same item name.
 */
const bukaStok = async (user) => {
  await klikTab(user, 'Barang');
  await user.click(await screen.findByRole('button', { name: /^Stok/ }));
  const sheet = await screen.findByRole('dialog', { name: 'Stok' });
  await user.click(within(sheet).getByRole('button', { name: /Beras 1 kg/ }));
};

const isi = async (user, jumlah) => {
  const field = screen.getByLabelText('Jumlah');
  await user.clear(field);
  await user.type(field, String(jumlah));
};

test('barang masuk puts a kulakan run back on the shelf', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. Barang shows why the stock screen is worth opening');
  await klikTab(user, 'Barang');
  // minStock is 5 and only 3 are left, so the summary has to say so.
  await screen.findByText('1 menipis');

  log('2. open Stok, pick Beras');
  await bukaStok(user);
  const current = (await screen.findByText('Stok sekarang')).closest('.stat');
  expect(within(current).getByText('3')).toBeTruthy();

  log('3. 24 sacks arrived');
  await isi(user, 24);
  await screen.findByText('Stok jadi 27');
  await user.type(screen.getByLabelText('Catatan'), 'Kulakan pasar');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  log('4. the shelf is 27 and the reason survived');
  await waitFor(async () => expect(await stockFor(beras.id)).toBe(27));

  // Ordered by id, which is a monotonic ULID, so this really is oldest first.
  const movements = await db.movements.where('itemId').equals(beras.id).toArray();
  expect(movements.at(-1)).toMatchObject({
    type: 'purchase',
    qty: 24,
    note: 'Kulakan pasar',
  });
  // The opening movement is still there, unedited.
  expect(movements[0]).toMatchObject({ qty: 3, note: 'Stok awal' });
  log('   stok 3 -> 27, recorded as barang masuk, opening movement left alone');

  log('5. the warning is gone from the Barang summary');
  await screen.findByText('Semua stok aman');
});

test('stok opname writes the counted figure and keeps the shrinkage visible', async () => {
  const user = userEvent.setup();
  render(<App />);

  await bukaStok(user);

  log('1. counted 1 on the shelf, the app believed 3');
  await user.click(screen.getByRole('button', { name: 'Stok opname' }));
  await isi(user, 1);

  await screen.findByText('Stok jadi 1');
  const selisih = (await screen.findByText('Selisih')).closest('.stat');
  expect(within(selisih).getByText('-2')).toBeTruthy();
  log('   the screen names the difference before saving, not after');

  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  log('2. the adjustment is appended, never an edit of what came before');
  await waitFor(async () => expect(await stockFor(beras.id)).toBe(1));
  const movements = await db.movements.where('itemId').equals(beras.id).toArray();
  expect(movements).toHaveLength(2);
  expect(movements.at(-1)).toMatchObject({
    type: 'adjustment',
    qty: -2,
    counted: 1,
    previous: 3,
  });
  log(`   ${movements.length} movements on disk: stok awal + adjustment(-2)`);
});

test('barang rusak leaves the shelf without reading as a sale', async () => {
  const user = userEvent.setup();
  render(<App />);

  await bukaStok(user);
  await user.click(screen.getByRole('button', { name: 'Barang rusak' }));
  await isi(user, 2);
  await screen.findByText('Stok jadi 1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  await waitFor(async () => expect(await stockFor(beras.id)).toBe(1));

  const movements = await db.movements.toArray();
  expect(movements.at(-1)).toMatchObject({ type: 'waste', qty: -2 });
  // The distinction the shop needs: both took goods off the shelf, only one
  // brought money in.
  expect(await db.sales.count()).toBe(0);
  log('   stok 3 -> 1 as waste, and no sale was invented to explain it');
});
