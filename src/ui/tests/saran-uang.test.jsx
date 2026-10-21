// @vitest-environment jsdom
//
// A fixed row of quick amounts offered Rp5.000 on a Rp15.000 sale. This checks
// the payment sheet now offers amounts that can actually cover the total, and
// that picking one fills in the change.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { db, TABLES } from '../../data/db.js';
import { createItem } from '../../data/items.js';
import { applyPreset } from '../../data/settings.js';

beforeEach(async () => {
  cleanup();
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('warungMakan', 'Warung Bu Ani');
  await createItem({ name: 'Nasi goreng', price: 15000 });
});

test('quick amounts cover the total and picking one shows the change', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(await screen.findByRole('button', { name: /Bayar Rp/ }));
  await screen.findByText('Pembayaran');

  expect(screen.queryByRole('button', { name: 'Rp10.000' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Rp20.000' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Rp50.000' })).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Rp20.000' }));
  expect(screen.getByText('Kembalian')).toBeTruthy();
  expect(screen.getByText('Rp5.000')).toBeTruthy();
});

test('the payment sheet says how many kinds of items are being paid for', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));
  await user.click(await screen.findByRole('button', { name: /Bayar Rp/ }));
  await screen.findByText('Pembayaran');

  expect(screen.getByText('(1 jenis barang)')).toBeTruthy();
});
