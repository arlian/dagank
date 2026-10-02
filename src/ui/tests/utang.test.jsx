// @vitest-environment jsdom
//
// The reminder is the reason most shops keep an utang book at all, and
// chasing it in person is awkward. This drives the Utang screen to the
// WhatsApp link, with and without a number, and checks the message carries
// the balance the ledger says is owed.

import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { db, newId, stamps, TABLES } from '../../data/db.js';
import { createCustomer, getCustomer } from '../../data/customers.js';
import { debtEntry } from '../../domain/ledger.js';
import { applyPreset } from '../../data/settings.js';

const log = (step) => console.log(`  ${step}`);

let customer;

beforeEach(async () => {
  cleanup();
  window.location.hash = '';
  for (const table of TABLES) await db.table(table).clear();
  await applyPreset('kelontong', 'Toko Pak Budi');
  customer = await createCustomer({ name: 'Bu Sri' });
  await db.ledger.add({ id: newId(), ...debtEntry(customer.id, 12000, null), ...stamps() });
});

const bukaUtang = async (user) => {
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name: 'Utang' }));
  await user.click(await screen.findByRole('button', { name: /Bu Sri/ }));
  return screen.findByRole('dialog', { name: 'Bu Sri' });
};

const pesanDari = (link) => decodeURIComponent(new URL(link.href).searchParams.get('text'));

test('a reminder opens WhatsApp with the balance, and the number once saved', async () => {
  const user = userEvent.setup();
  render(<App />);
  const sheet = await bukaUtang(user);

  log('1. no number yet: WhatsApp will ask which chat');
  const link = within(sheet).getByRole('link', { name: 'Tagih lewat WhatsApp' });
  expect(new URL(link.href).pathname).toBe('/');
  const pesan = pesanDari(link);
  expect(pesan).toContain('Halo Bu Sri');
  expect(pesan).toContain('Toko Pak Budi');
  expect(pesan).toContain('Rp12.000');
  log('   message names the customer, the shop, and Rp12.000');

  log('2. a mistyped number is refused, not saved');
  const input = within(sheet).getByLabelText('Nomor WhatsApp');
  await user.type(input, '021555');
  await user.click(within(sheet).getByRole('button', { name: 'Simpan' }));
  expect(await within(sheet).findByText(/belum bisa dipakai/)).toBeTruthy();
  expect((await getCustomer(customer.id)).phone).toBeNull();

  log('3. a real number is saved and the link goes straight to that chat');
  await user.clear(input);
  await user.type(input, '0812-3456-7890');
  await user.click(within(sheet).getByRole('button', { name: 'Simpan' }));
  await waitFor(async () =>
    expect((await getCustomer(customer.id)).phone).toBe('0812-3456-7890'),
  );
  await waitFor(() =>
    expect(
      new URL(within(sheet).getByRole('link', { name: 'Tagih lewat WhatsApp' }).href)
        .pathname,
    ).toBe('/6281234567890'),
  );
  log('   wa.me/6281234567890');
});

test('the reminder is gone once the debt is paid off', async () => {
  const user = userEvent.setup();
  render(<App />);
  const sheet = await bukaUtang(user);

  await user.click(within(sheet).getByRole('button', { name: 'Sudah lunas' }));
  await user.click(within(sheet).getByRole('button', { name: 'Bayar utang' }));

  // Paying it all closes the sheet; reopening from the ledger is not
  // possible either, since the customer leaves the outstanding list.
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Bu Sri' })).toBeNull());
  expect(screen.queryByRole('link', { name: 'Tagih lewat WhatsApp' })).toBeNull();
});

test('a number can be given when the customer is first added', async () => {
  const user = userEvent.setup();
  render(<App />);
  const bar = await screen.findByRole('navigation');
  await user.click(within(bar).getByRole('button', { name: 'Utang' }));
  await user.click(await screen.findByRole('button', { name: /Pelanggan/ }));

  const sheet = await screen.findByRole('dialog', { name: 'Tambah pelanggan' });
  await user.type(within(sheet).getByPlaceholderText('Nama pelanggan'), 'Mas Joko');
  await user.type(within(sheet).getByLabelText('Nomor WhatsApp'), '+62 813 1111 2222');
  await user.click(within(sheet).getByRole('button', { name: 'Simpan' }));

  await waitFor(async () => {
    const joko = (await db.customers.toArray()).find((c) => c.name === 'Mas Joko');
    expect(joko.phone).toBe('+62 813 1111 2222');
  });
});
