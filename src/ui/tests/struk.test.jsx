// @vitest-environment jsdom
//
// The gap this covers: there was no printing of any kind, and src/printer/ did
// not exist. A shop with no thermal printer still has to be able to hand over
// a struk, so the share path matters as much as the Bluetooth one.

import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { db, TABLES } from '../../data/db.js';
import { createItem } from '../../data/items.js';
import { applyPreset, saveSettings } from '../../data/settings.js';

const log = (step) => console.log(`  ${step}`);

beforeEach(async () => {
  cleanup();
  // The hash survives cleanup, so without this a test starts on whatever
  // screen the previous one navigated to.
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('warungMakan', 'Warung Bu Ani');
  await saveSettings({ alamat: 'Jl. Melati 12', telepon: '0812-3456' });
  await createItem({ name: 'Nasi goreng', price: 15000 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const klikTab = async (user, name) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name }));
};

const jual = async (user) => {
  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(screen.getByRole('button', { name: /Bayar Rp/ }));
  await screen.findByText('Pembayaran');
  await user.click(screen.getByRole('button', { name: 'Rp20.000' }));
  await user.click(screen.getByRole('button', { name: 'Selesai' }));
};

test('the struk is offered after a sale and never gets in the way of one', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. sell one nasi goreng, tendering Rp20.000');
  await jual(user);

  log('2. the stamp offers a struk without demanding one');
  const struk = await screen.findByRole('button', { name: 'Struk' });
  await screen.findByText(/Kembalian Rp5\.000/);
  await user.click(struk);

  log('3. the preview is what the paper will say');
  const sheet = await screen.findByRole('dialog', { name: 'Struk' });
  const teks = sheet.textContent;
  expect(teks).toContain('Warung Bu Ani');
  expect(teks).toContain('Jl. Melati 12');
  expect(teks).toMatch(/TOTAL\s+15\.000/);
  expect(teks).toMatch(/Tunai\s+20\.000/);
  expect(teks).toMatch(/Kembali\s+5\.000/);
  log('   header, total, tendered and change all present');

  log('4. every printed line fits 32 characters');
  const baris = [...sheet.querySelectorAll('.struk__baris')].map((n) => n.textContent);
  expect(baris.length).toBeGreaterThan(5);
  for (const b of baris) expect(b.length).toBeLessThanOrEqual(32);
});

test('a shop with no printer can still hand over a struk', async () => {
  const user = userEvent.setup();
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', Object.create(navigator, { share: { value: share } }));

  render(<App />);
  await jual(user);
  await user.click(await screen.findByRole('button', { name: 'Struk' }));
  await screen.findByRole('dialog', { name: 'Struk' });

  log('1. bagikan hands the struk to the share sheet, which is WhatsApp here');
  await user.click(screen.getByRole('button', { name: 'Bagikan' }));

  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  const { text, title } = share.mock.calls[0][0];
  expect(title).toBe('Warung Bu Ani');
  expect(text).toContain('TOTAL');
  expect(text).toContain('Nasi goreng');
  log(`   shared ${text.split('\n').length} lines of plain text`);

  // Web Bluetooth does not exist on iOS, and telling an iPhone about it does
  // not make it grow the capability.
  log('2. no Bluetooth button on a device that cannot do Bluetooth');
  expect(screen.queryByRole('button', { name: 'Cetak' })).toBeNull();
  expect(screen.getByText(/tidak bisa sambung printer Bluetooth/)).toBeTruthy();
});

test('an old sale can be reprinted from Laporan', async () => {
  const user = userEvent.setup();
  render(<App />);

  await jual(user);
  await waitFor(async () => expect(await db.sales.count()).toBe(1));

  log('1. open the sale from the day list');
  await klikTab(user, 'Laporan');
  const row = await screen.findByRole('button', { name: /Rp15\.000/ });
  await user.click(row);

  log('2. the same struk comes back');
  const sheet = await screen.findByRole('dialog', { name: 'Struk' });
  expect(sheet.textContent).toMatch(/TOTAL\s+15\.000/);
  log('   reprint costs the same as the first print');
});

test('a cart seller gets a short slip, not a full receipt', async () => {
  const user = userEvent.setup();
  await applyPreset('kakiLima', 'Gorengan Pak Budi');
  await saveSettings({ alamat: 'Jl. Melati 12' });
  await db.items.clear();
  await createItem({ name: 'Gorengan', price: 1000 });

  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Gorengan/ }));
  await user.click(screen.getByRole('button', { name: /Bayar Rp/ }));
  await user.click(await screen.findByRole('button', { name: 'Uang pas' }));
  await user.click(screen.getByRole('button', { name: 'Selesai' }));

  await user.click(await screen.findByRole('button', { name: 'Struk' }));
  const sheet = await screen.findByRole('dialog', { name: 'Struk' });

  expect(sheet.textContent).toContain('Gorengan Pak Budi');
  // Paper costs the seller money on a thousand-rupiah sale.
  expect(sheet.textContent).not.toContain('Jl. Melati 12');
  log('   name and total, no address block');
});
