// @vitest-environment jsdom
//
// The gap this covers: the shifts table and shiftSummary() were written and
// tested, and nothing ever called them. This drives the real screens through
// a full day: open the drawer, sell, count it back, read the selisih.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { db, TABLES } from '../data/db.js';
import { createItem } from '../data/items.js';
import { applyPreset, setFeature } from '../data/settings.js';

const log = (step) => console.log(`  ${step}`);

beforeEach(async () => {
  cleanup();
  // The hash survives cleanup, so without this a test starts on whatever
  // screen the previous one navigated to.
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('warungMakan', 'Warung Bu Ani');
  await createItem({ name: 'Nasi goreng', price: 15000 });
});

const klikTab = async (user, name) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name }));
};

/** Taps the money keypad, which is how every rupiah figure is entered here. */
const ketik = async (user, digits) => {
  for (const digit of String(digits)) {
    await user.click(screen.getByRole('button', { name: digit }));
  }
};

test('a shopkeeper opens the drawer, sells, and counts it back', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. Laporan says the drawer has not been opened yet');
  await klikTab(user, 'Laporan');
  await screen.findByText('Kasir belum dibuka hari ini.');

  log('2. buka kasir with Rp100.000 of float');
  await user.click(screen.getByRole('button', { name: 'Buka kasir' }));
  await screen.findByText('Hitung uang di laci sebelum mulai jualan.');
  await ketik(user, '100000');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  await waitFor(async () => expect(await db.shifts.count()).toBe(1));
  const kasAwal = (await screen.findByText('Kas awal')).closest('.stat');
  expect(within(kasAwal).getByText('Rp100.000')).toBeTruthy();
  log('   shift open, kas awal Rp100.000');

  log('3. sell one nasi goreng for cash');
  await klikTab(user, 'Kasir');
  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(screen.getByRole('button', { name: /Bayar Rp/ }));
  await screen.findByText('Pembayaran');
  await user.click(screen.getByRole('button', { name: 'Uang pas' }));
  await user.click(screen.getByRole('button', { name: 'Selesai' }));
  await waitFor(async () => expect(await db.sales.count()).toBe(1));

  log('4. the drawer figure moved on its own');
  await klikTab(user, 'Laporan');
  await waitFor(async () => {
    const row = (await screen.findByText('Seharusnya')).closest('.stat');
    expect(within(row).getByText('Rp115.000')).toBeTruthy();
  });
  log('   seharusnya Rp115.000 = Rp100.000 float + Rp15.000 taken');

  log('5. tutup kasir, and the drawer is Rp5.000 short');
  await user.click(screen.getByRole('button', { name: 'Tutup kasir' }));
  await ketik(user, '110000');
  // Named before saving, while the money is still in hand and recountable.
  await screen.findByText(/Kurang Rp5\.000/);
  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  log('6. the shift is closed and the shortfall is on record');
  await waitFor(async () => {
    const [shift] = await db.shifts.toArray();
    expect(shift.closedAt).toBeTruthy();
    expect(shift.selisih).toBe(-5000);
  });

  await screen.findByText('Kasir belum dibuka hari ini.');
  await screen.findByText('Kasir sebelumnya');
  log('   selisih -5000 stored, drawer ready to be opened again tomorrow');
});

test('a cart seller is never shown a drawer to count', async () => {
  const user = userEvent.setup();
  await applyPreset('kakiLima', 'Gorengan Pak Budi');
  render(<App />);

  await klikTab(user, 'Laporan');
  await screen.findByRole('heading', { name: 'Laporan' });

  // Absent, not disabled: there is no drawer at a gerobak.
  expect(screen.queryByRole('button', { name: 'Buka kasir' })).toBeNull();
  expect(screen.queryByText('Kas')).toBeNull();
  log('   kakiLima gets no Kas card at all');
});

test('the drawer appears once the shop turns the flag on', async () => {
  const user = userEvent.setup();
  await applyPreset('kakiLima', 'Gorengan Pak Budi');
  await setFeature('shift', true);
  render(<App />);

  await klikTab(user, 'Laporan');
  expect(await screen.findByRole('button', { name: 'Buka kasir' })).toBeTruthy();
  log('   the preset is a starting point, not a cage');
});
