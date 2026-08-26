// @vitest-environment jsdom
//
// A photo on the tile is how a seller finds an item by looking instead of by
// reading, which is the whole speed argument for the board. This drives it
// through the real screens: the picture reaches the tile, tapping it still
// rings up the item, and with the flag off both the picture and the control
// that sets one are absent rather than disabled.
//
// The upload itself is not exercised here: shrinking a photo needs a canvas,
// which jsdom does not have. The repository path it feeds is covered in
// src/data/items.test.js.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { db, TABLES } from '../../data/db.js';
import { createItem } from '../../data/items.js';
import { applyPreset, setFeature } from '../../data/settings.js';

const FOTO = 'data:image/jpeg;base64,nasigoreng';

const log = (step) => console.log(`  ${step}`);

beforeEach(async () => {
  cleanup();
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('warungMakan', 'Warung Bu Ani');
  await createItem({ name: 'Nasi goreng', price: 15000, foto: FOTO });
});

test('the board shows the photo, and the tile still rings up in one tap', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. the tile carries the picture');
  const tile = await screen.findByRole('button', { name: /Nasi goreng/ });
  const img = tile.querySelector('img');
  expect(img).toBeTruthy();
  expect(img.getAttribute('src')).toBe(FOTO);

  // Decorative: the name is right underneath it, and a screen reader reading
  // the item twice would be worse than saying it once.
  expect(img.getAttribute('alt')).toBe('');
  log('   photo is decorative, the name carries the meaning');

  log('2. one tap still adds it -- the picture did not cost a tap');
  await user.click(tile);
  const bayar = await screen.findByRole('button', { name: /Bayar Rp/ });
  expect(bayar.textContent).toBe('Bayar Rp15.000');
});

test('with the flag off the photo is gone and so is the way to add one', async () => {
  const user = userEvent.setup();
  await setFeature('foto', false);
  render(<App />);

  log('1. the same item, now a plain tile');
  const tile = await screen.findByRole('button', { name: /Nasi goreng/ });
  expect(tile.querySelector('img')).toBeNull();

  log('2. the form offers no photo control at all');
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name: 'Menu' }));
  await user.click(await screen.findByRole('button', { name: '+ Tambah' }));

  await screen.findByLabelText('Nama barang');
  expect(screen.queryByRole('button', { name: 'Ambil foto' })).toBeNull();
  expect(screen.queryByText('Foto')).toBeNull();
  log('   absent, not disabled');
});

test('the photo survives an edit that never mentions it', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. open the menu item; the form arrives already holding its photo');
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name: 'Menu' }));
  await user.click(await screen.findByRole('button', { name: /Nasi goreng/ }));

  // "Ganti", not "Ambil": the form fetched the photo out of its own table, so
  // saving cannot read the untouched field as an instruction to remove it.
  await screen.findByRole('button', { name: 'Ganti foto' });
  await user.click(screen.getByRole('button', { name: 'Simpan' }));

  log('2. the tile still has its picture');
  await user.click(within(bar).getByRole('button', { name: 'Kasir' }));
  const tile = await screen.findByRole('button', { name: /Nasi goreng/ });
  expect(tile.querySelector('img')?.getAttribute('src')).toBe(FOTO);
});
