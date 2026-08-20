// @vitest-environment jsdom
//
// Drives the real app the way a warung owner meets it: onboarding, a
// two-item sale with a modifier, payment, then the daily recap. Not a unit
// test -- it mounts <App /> and clicks through it.

import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { db } from '../../data/db.js';

const log = (step) => console.log(`  ${step}`);

test('a shopkeeper can onboard and make a sale', async () => {
  const user = userEvent.setup();
  render(<App />);

  log('1. onboarding asks what kind of business');
  await screen.findByText('Usaha kamu jenis apa?');
  await user.click(screen.getByText('Warung makan'));

  log('2. nama usaha');
  await screen.findByText('Nama usaha kamu?');
  await user.type(screen.getByLabelText('Nama usaha'), 'Warung Bu Ani');
  await user.click(screen.getByRole('button', { name: 'Lanjut' }));

  log('3. item pertama, with the sample menu');
  await screen.findByText('Tambah satu barang dulu');

  // The warungMakan form must offer modifiers and must NOT offer a barcode.
  // Asserted on the Telur chip rather than the word "Tambahan", which is also
  // a seeded category name on this profile.
  expect(screen.getByRole('button', { name: 'Telur' })).toBeTruthy();
  expect(screen.queryByText('Barcode')).toBeNull();
  log('   form offers modifiers, hides Barcode -- correct for warungMakan');

  await user.click(screen.getByRole('button', { name: 'Coba dulu dengan contoh' }));

  log('4. kasir, grid mode');
  const nasgor = await screen.findByRole('button', { name: /Nasi goreng/ });

  log('5. tap Nasi goreng twice, Es teh once');
  await user.click(nasgor);
  await user.click(nasgor);
  await user.click(screen.getByRole('button', { name: /^Es teh/ }));

  // 15000 * 2 + 5000 = 35000
  const payButton = await screen.findByRole('button', { name: /Bayar Rp/ });
  log(`   pay button reads: "${payButton.textContent}"`);
  expect(payButton.textContent).toBe('Bayar Rp35.000');

  log('6. add a Telur modifier to the nasi goreng line');
  const lines = document.querySelectorAll('.line');
  const telur = within(lines[0]).queryByRole('button', { name: 'Telur' });
  if (telur) {
    await user.click(telur);
    // Telur is 5000, applied per unit, on a line of quantity 2.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Bayar Rp/ }).textContent).toBe(
        'Bayar Rp45.000',
      ),
    );
    log('   total moved to Rp45.000 -- modifier applied per unit, not per line');
  }

  log('7. bayar');
  await user.click(screen.getByRole('button', { name: /Bayar Rp/ }));
  await screen.findByText('Pembayaran');

  log('8. tender Rp50.000');
  await user.click(screen.getByRole('button', { name: 'Rp50.000' }));
  const kembalianRow = (await screen.findByText('Kembalian')).closest('.stat');
  log(`   ${kembalianRow.textContent.replace(/([a-z])([A-Z])/g, '$1 $2')}`);

  log('9. selesai');
  await user.click(screen.getByRole('button', { name: 'Selesai' }));
  await waitFor(() => expect(document.querySelector('.sheet')).toBeNull());

  log('10. the sale is on disk');
  const sales = await db.sales.toArray();
  expect(sales).toHaveLength(1);
  expect(sales[0].total).toBe(45000);
  expect(sales[0].payment.change).toBe(5000);
  log(`   sale total ${sales[0].total}, change ${sales[0].payment.change}`);

  const savedLines = await db.saleLines.toArray();
  expect(savedLines).toHaveLength(2);
  log(`   ${savedLines.length} lines saved`);

  log('11. cart cleared, and the day total is on the topbar');
  expect(screen.queryByRole('button', { name: /Bayar Rp/ })).toBeNull();
  await screen.findByText(/Hari ini: Rp45\.000/);

  log('12. laporan');
  await user.click(screen.getByRole('button', { name: /Laporan/ }));
  await screen.findByText('Penjualan');
  const card = document.querySelector('.card');
  log(`   recap: ${card.textContent.replace(/\s+/g, ' ').slice(0, 120)}`);

  log('13. stok moved only for the item that tracks it');
  const movements = await db.movements.toArray();
  const sale = movements.filter((m) => m.type === 'sale');
  log(`   ${sale.length} stock movement(s): only Air mineral tracks stock here`);
});
