import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SettingsProvider } from './settings-context.jsx';
import { featuresFor } from '../profiles/index.js';
import ItemForm from './screens/ItemForm.jsx';
import { emptyItem } from '../data/items.js';

// The item form is where the generalisation succeeds or fails, so these
// assert the rule directly: when a flag is off, the field is ABSENT.
const renderForm = (profile) => {
  const settings = {
    namaUsaha: 'Warung Bu Ani',
    profile,
    features: featuresFor(profile),
    rounding: 'none',
    onboarded: true,
  };
  return renderToString(
    <SettingsProvider value={{ settings, refresh: async () => {} }}>
      <ItemForm value={emptyItem()} onChange={() => {}} categories={[]} />
    </SettingsProvider>,
  );
};

describe('ItemForm follows the feature flags', () => {
  it('shows barcode, satuan, and stok for a kelontong', () => {
    const html = renderForm('kelontong');
    expect(html).toContain('Barcode');
    expect(html).toContain('Satuan');
    expect(html).toContain('Catat stok');
    expect(html).toContain('Harga modal');
  });

  it('gives a kaki lima seller no barcode, no satuan, and no stok', () => {
    const html = renderForm('kakiLima');
    expect(html).not.toContain('Barcode');
    expect(html).not.toContain('Satuan');
    expect(html).not.toContain('Catat stok');
  });

  it('offers modifiers to a warung makan and to nobody else', () => {
    expect(renderForm('warungMakan')).toContain('Telur');
    expect(renderForm('kelontong')).not.toContain('Telur');
  });

  it('never asks a jasa seller for a cost price', () => {
    const html = renderForm('jasa');
    expect(html).not.toContain('Harga modal');
    expect(html).toContain('Harga jual');
  });

  it('always asks for name and price', () => {
    for (const profile of ['kelontong', 'warungMakan', 'kakiLima', 'jasa']) {
      const html = renderForm(profile);
      expect(html).toContain('Nama barang');
      expect(html).toContain('Harga jual');
    }
  });
});
