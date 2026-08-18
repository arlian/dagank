// @vitest-environment jsdom
//
// The gap this covers: Laporan was locked to salesOn(), so at one minute past
// midnight the whole of yesterday became unreachable -- no weekly figure, and
// no way back to a receipt to reprint or cancel it.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { db, TABLES } from '../data/db.js';
import { createItem } from '../data/items.js';
import { recordSale, lineFromItem } from '../data/sales.js';
import { applyPreset } from '../data/settings.js';

const log = (step) => console.log(`  ${step}`);

const HARI = 86_400_000;

let beras;

beforeEach(async () => {
  cleanup();
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('kelontong', 'Toko Bu Ani');
  beras = await createItem({ name: 'Beras 1 kg', price: 13000, cost: 11500 });
});

/**
 * A sale that happened `daysAgo` days ago. Recorded through the real path and
 * then backdated, because createdAt is stamped on write and there is no way
 * in -- and no reason to add one outside a test.
 */
const jual = async (daysAgo, qty = 1) => {
  const sale = await recordSale({
    lines: [lineFromItem(beras, { qty })],
    payment: { method: 'tunai', paid: 13000 * qty },
  });
  if (daysAgo > 0) {
    await db.sales.update(sale.id, { createdAt: sale.createdAt - daysAgo * HARI });
  }
  return sale;
};

const klikTab = async (user, name) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name }));
};

const stat = (label) =>
  screen
    .getAllByText(label)
    .map((el) => el.closest('.stat'))
    .find(Boolean);

test('a week of takings is one tap away, and yesterday is reachable again', async () => {
  await jual(0);
  await jual(3, 2);

  const user = userEvent.setup();
  render(<App />);
  await klikTab(user, 'Laporan');

  log('1. Hari ini shows only today: one sale of Rp13.000');
  await waitFor(() => expect(within(stat('Penjualan')).getByText('Rp13.000')).toBeTruthy());
  expect(within(stat('Transaksi')).getByText('1')).toBeTruthy();
  expect(screen.queryByText('Per hari')).toBeNull();

  log('2. switch to 7 hari');
  await user.click(screen.getByRole('button', { name: '7 hari' }));

  // 13.000 today plus 26.000 three days ago.
  await waitFor(() => expect(within(stat('Penjualan')).getByText('Rp39.000')).toBeTruthy());
  expect(within(stat('Transaksi')).getByText('2')).toBeTruthy();
  log('   penjualan Rp39.000 across 2 transaksi');

  log('3. the week breaks down per day, which is the question being asked');
  const perHari = (await screen.findByText('Per hari')).closest('.card');
  const baris = perHari.querySelectorAll('.stat');
  expect(baris).toHaveLength(2);
  // Newest first, so the top row is today.
  expect(within(baris[0]).getByText('Rp13.000')).toBeTruthy();
  expect(within(baris[1]).getByText('Rp26.000')).toBeTruthy();
  expect(within(perHari).getByText(/Rata-rata sehari/)).toBeTruthy();
  log('   two days listed, newest first, with a daily average');

  log('4. the older sale can be opened as a struk from here');
  const daftar = document.querySelectorAll('.list__item');
  expect(daftar).toHaveLength(2);
  await user.click(within(daftar[1]).getByRole('button', { name: /Rp26.000/ }));
  await screen.findByRole('dialog', { name: 'Struk' });
  log('   a three-day-old receipt is back in reach');
});

test('the drawer and the expense book stay on today', async () => {
  await jual(0);

  const user = userEvent.setup();
  render(<App />);
  await klikTab(user, 'Laporan');

  log('1. on Hari ini the shop can open its drawer and record what it spent');
  expect(await screen.findByRole('button', { name: 'Buka kasir' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Catat pengeluaran' })).toBeTruthy();

  log('2. on 30 hari both step aside: neither is a thing you do to a month');
  await user.click(screen.getByRole('button', { name: '30 hari' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Buka kasir' })).toBeNull());
  expect(screen.queryByRole('button', { name: 'Catat pengeluaran' })).toBeNull();

  log('3. and come back when the window does');
  await user.click(screen.getByRole('button', { name: 'Hari ini' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Buka kasir' })).toBeTruthy());
});

test('a window with nothing in it says so, and can be left again', async () => {
  const user = userEvent.setup();
  render(<App />);
  await klikTab(user, 'Laporan');

  await screen.findByText('Belum ada transaksi hari ini.');
  await user.click(screen.getByRole('button', { name: '7 hari' }));

  log('1. an empty week reads as an empty week, not as an empty day');
  await screen.findByText('Belum ada transaksi di rentang ini.');
  // The chips stay put, so there is always a way back.
  expect(screen.getByRole('button', { name: 'Hari ini' })).toBeTruthy();
});
