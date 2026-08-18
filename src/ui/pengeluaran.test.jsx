// @vitest-environment jsdom
//
// The gap this covers: "untung" was margin on goods and nothing else, so a
// shop that bought plastic bags and paid for petrol out of the same drawer
// read a profit it never had, and came up short at closing every time.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { db, TABLES } from '../data/db.js';
import { createItem } from '../data/items.js';
import { applyPreset } from '../data/settings.js';

const log = (step) => console.log(`  ${step}`);

beforeEach(async () => {
  cleanup();
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('kelontong', 'Toko Bu Ani');
  await createItem({ name: 'Beras 1 kg', price: 13000, cost: 11500 });
});

const klikTab = async (user, name) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name }));
};

const ketik = async (user, digits) => {
  for (const digit of String(digits)) {
    await user.click(screen.getByRole('button', { name: digit }));
  }
};

// "Pengeluaran" is both a recap row and a card heading, so the row is picked
// by the one with a .stat ancestor rather than by text alone.
const stat = (label) =>
  screen
    .getAllByText(label)
    .map((el) => el.closest('.stat'))
    .find(Boolean);

test('an expense comes off the profit and out of the expected drawer', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. buka kasir with Rp50.000');
  await klikTab(user, 'Laporan');
  await user.click(await screen.findByRole('button', { name: 'Buka kasir' }));
  await ketik(user, '50000');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(async () => expect(await db.shifts.count()).toBe(1));

  log('2. sell one beras for cash: 13.000 in, 1.500 of margin');
  await klikTab(user, 'Kasir');
  // kelontong runs in cari mode, so the item is searched for, not tapped.
  await user.type(await screen.findByPlaceholderText('Cari barang'), 'beras');
  await user.click(await screen.findByRole('button', { name: /Beras 1 kg/ }));
  await user.click(await screen.findByRole('button', { name: /Bayar Rp/ }));
  await user.click(await screen.findByRole('button', { name: 'Uang pas' }));
  await user.click(screen.getByRole('button', { name: 'Selesai' }));
  await waitFor(async () => expect(await db.sales.count()).toBe(1));

  log('3. record Rp5.000 of plastic bags, taken from the drawer');
  await klikTab(user, 'Laporan');
  await user.click(await screen.findByRole('button', { name: 'Catat pengeluaran' }));
  await ketik(user, '5000');
  await user.click(screen.getByRole('button', { name: 'Lain-lain' }));
  await user.type(screen.getByLabelText('Catatan'), 'Beli plastik');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  await waitFor(async () => expect(await db.expenses.count()).toBe(1));
  const expense = (await db.expenses.toArray())[0];
  expect(expense.amount).toBe(5000);
  expect(expense.dariLaci).toBe(true);
  expect(expense.status).toBe('selesai');
  log('   stored append-only, marked as taken from the drawer');

  log('4. the recap subtracts it from the margin');
  await waitFor(() => expect(within(stat('Pengeluaran')).getByText('−Rp5.000')).toBeTruthy());
  expect(within(stat('Untung kotor')).getByText('Rp1.500')).toBeTruthy();
  // 1.500 of margin minus 5.000 spent is a loss, and the app says so.
  expect(within(stat('Sisa bersih')).getByText('-Rp3.500')).toBeTruthy();
  log('   untung kotor Rp1.500, pengeluaran Rp5.000, sisa bersih -Rp3.500');

  log('5. and the drawer is expected to be 5.000 lighter');
  // 50.000 float + 13.000 taken - 5.000 spent = 58.000
  await waitFor(() => expect(within(stat('Seharusnya')).getByText('Rp58.000')).toBeTruthy());
  expect(within(stat('Uang keluar')).getByText('−Rp5.000')).toBeTruthy();
  log('   seharusnya Rp58.000, so counting 58.000 gives a selisih of nol');
});

test('an expense paid from outside the drawer leaves the drawer alone', async () => {
  const user = userEvent.setup();
  render(<App />);

  await klikTab(user, 'Laporan');
  await user.click(await screen.findByRole('button', { name: 'Buka kasir' }));
  await ketik(user, '50000');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(async () => expect(await db.shifts.count()).toBe(1));

  log('1. pay a Rp20.000 electricity bill by transfer, not from the till');
  await user.click(await screen.findByRole('button', { name: 'Catat pengeluaran' }));
  await ketik(user, '20000');
  await user.click(screen.getByRole('button', { name: 'Listrik & air' }));
  await user.click(screen.getByLabelText('Uang diambil dari laci'));
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(async () => expect(await db.expenses.count()).toBe(1));

  log('2. it counts as money spent, but the drawer still holds the float');
  // No sales today, so the recap card is not on screen at all; the expense
  // card carries its own total, which is the number to check here.
  const kartu = (await screen.findByText('Pengeluaran')).closest('.card');
  // Twice: once as the row, once as the card total, which is the whole of it.
  await waitFor(() => expect(within(kartu).getAllByText('Rp20.000')).toHaveLength(2));
  expect(within(kartu).getByText(/Dibayar dari luar laci/)).toBeTruthy();
  expect(within(stat('Seharusnya')).getByText('Rp50.000')).toBeTruthy();
  expect(screen.queryByText('Uang keluar')).toBeNull();
  log('   pengeluaran Rp20.000, seharusnya still Rp50.000');
});

test('a mistyped expense is cancelled, never deleted', async () => {
  const user = userEvent.setup();
  window.confirm = () => true;
  render(<App />);

  await klikTab(user, 'Laporan');
  await user.click(await screen.findByRole('button', { name: 'Catat pengeluaran' }));
  await ketik(user, '900000');
  await user.click(screen.getByRole('button', { name: 'Transport' }));
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(async () => expect(await db.expenses.count()).toBe(1));
  log('1. Rp900.000 entered by mistake');

  const baris = (await screen.findByText('Transport')).closest('.line');
  await user.click(within(baris).getByRole('button', { name: 'Batal' }));

  log('2. cancelled: the row survives, the total does not');
  await waitFor(async () => {
    const rows = await db.expenses.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('batal');
    expect(rows[0].voidedAt).toBeTypeOf('number');
  });
  await waitFor(() => expect(screen.getByText('Belum ada pengeluaran hari ini.')).toBeTruthy());
  expect(screen.queryByText('Pengeluaran', { selector: '.stat span' })).toBeNull();
});
