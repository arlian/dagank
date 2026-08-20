// @vitest-environment jsdom
//
// The gap this covers: 'qris' and 'transfer' were understood by the receipt
// builder and by the daily recap, but no screen could produce one, so every
// QRIS sale was being rung up as cash and the drawer never balanced. This
// drives a QRIS sale through the real screens and checks the money lands
// outside the drawer.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { db, TABLES } from '../../data/db.js';
import { createItem } from '../../data/items.js';
import { applyPreset, saveSettings } from '../../data/settings.js';

const log = (step) => console.log(`  ${step}`);

beforeEach(async () => {
  cleanup();
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('warungMakan', 'Warung Bu Ani');
  await createItem({ name: 'Nasi goreng', price: 15000 });
});

const klikTab = async (user, name) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name }));
};

test('a QRIS sale is paid in full and stays out of the drawer', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. ring up one nasi goreng');
  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(await screen.findByRole('button', { name: /Bayar Rp/ }));

  log('2. pay by QRIS');
  await screen.findByText('Pembayaran');
  await user.click(screen.getByRole('button', { name: 'QRIS' }));

  // No keypad and no quick amounts: there is nothing to tender.
  expect(screen.queryByRole('button', { name: 'Uang pas' })).toBeNull();
  expect(screen.getByText('Uang masuk ke rekening, bukan ke laci.')).toBeTruthy();
  log('   keypad absent, and the sheet says where the money went');

  // Selesai is enabled without entering an amount, unlike a cash sale.
  await user.click(screen.getByRole('button', { name: 'Selesai' }));

  await waitFor(async () => expect(await db.sales.count()).toBe(1));
  const sale = (await db.sales.toArray())[0];
  expect(sale.payment.method).toBe('qris');
  expect(sale.payment.paid).toBe(15000);
  expect(sale.payment.change).toBe(0);
  log(`   stored as ${sale.payment.method}, paid ${sale.payment.paid}, change 0`);

  log('3. the recap counts it as non tunai, and tunai stays empty');
  await klikTab(user, 'Laporan');
  const nonTunai = (await screen.findByText('Non tunai')).closest('.stat');
  expect(within(nonTunai).getByText('Rp15.000')).toBeTruthy();
  const tunai = screen.getByText('Tunai').closest('.stat');
  expect(within(tunai).getByText('Rp0')).toBeTruthy();
  log('   non tunai Rp15.000, tunai Rp0 -- the drawer is untouched');
});

test('the QRIS picture is shown only once the shop has uploaded one', async () => {
  const user = userEvent.setup();
  // A 1x1 gif is enough: the screen only ever hands the string to an <img>.
  const gambar = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(await screen.findByRole('button', { name: /Bayar Rp/ }));
  await user.click(await screen.findByRole('button', { name: 'QRIS' }));

  log('1. no picture saved, so no button offering one');
  expect(screen.queryByRole('button', { name: 'Tunjukkan QRIS' })).toBeNull();

  cleanup();
  await saveSettings({ qris: gambar });
  render(<App />);

  log('2. with a picture saved, the cashier can show it full screen');
  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(await screen.findByRole('button', { name: /Bayar Rp/ }));
  await user.click(await screen.findByRole('button', { name: 'QRIS' }));
  await user.click(await screen.findByRole('button', { name: 'Tunjukkan QRIS' }));

  const layar = await screen.findByRole('dialog', { name: 'Scan buat bayar' });
  expect(within(layar).getByRole('img').getAttribute('src')).toBe(gambar);
  // The amount rides along, because the customer checks it against their app.
  expect(within(layar).getByText('Rp15.000')).toBeTruthy();
  log('   picture and amount on one screen, ready to hand across the counter');

  await user.click(within(layar).getByRole('button', { name: 'Tutup' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Scan buat bayar' })).toBeNull(),
  );
});
