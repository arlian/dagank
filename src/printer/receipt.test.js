import { describe, expect, it } from 'vitest';
import { buildReceipt, center, divider, leftRight, shortRef, toText, WIDTH } from './receipt.js';

const sale = (over = {}) => ({
  id: '01J8ZQBK7MXY9WVTC3H2ABCD',
  createdAt: new Date('2026-08-15T19:42:00').getTime(),
  subtotal: 40000,
  discount: 0,
  rounding: 0,
  total: 40000,
  payment: { method: 'tunai', paid: 50000, change: 10000 },
  status: 'selesai',
  ...over,
});

const line = (over = {}) => ({
  itemId: 'i1',
  name: 'Nasi goreng',
  qty: 2,
  price: 15000,
  cost: 9000,
  unit: null,
  modifiers: [],
  ...over,
});

const render = (opts) => toText(buildReceipt(opts)).split('\n');

describe('line helpers', () => {
  it('never exceeds the paper width', () => {
    expect(divider()).toHaveLength(WIDTH);
    expect(leftRight('Subtotal', '40.000')).toHaveLength(WIDTH);
    expect(center('Warung Bu Ani')).toHaveLength(WIDTH - 10);
  });

  it('puts the amount at the paper edge', () => {
    expect(leftRight('TOTAL', '40.000').endsWith('40.000')).toBe(true);
  });

  // The amount is the part that has to be right, so a long label gives way.
  it('shortens the label rather than the amount', () => {
    const row = leftRight('Minyak goreng sawit kemasan botol besar', '1.250.000');
    expect(row).toHaveLength(WIDTH);
    expect(row.endsWith('1.250.000')).toBe(true);
  });

  it('shortens a ULID into something a customer can read out', () => {
    expect(shortRef('01J8ZQBK7MXY9WVTC3H2ABCD')).toBe('#ABCD');
  });
});

describe('buildReceipt', () => {
  const shop = { namaUsaha: 'Warung Bu Ani', alamat: 'Jl. Melati 12', telepon: '0812-3456' };

  it('fits every line on 32 characters', () => {
    const lines = render({
      sale: sale(),
      lines: [line(), line({ name: 'Es teh manis dingin sekali', qty: 1, price: 5000 })],
      shop,
      profile: 'warungMakan',
    });
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(WIDTH);
  });

  it('carries the shop header and the totals', () => {
    const out = render({ sale: sale(), lines: [line()], shop, profile: 'kelontong' }).join('\n');
    expect(out).toContain('Warung Bu Ani');
    expect(out).toContain('Jl. Melati 12');
    expect(out).toMatch(/TOTAL\s+40\.000/);
    expect(out).toMatch(/Tunai\s+50\.000/);
    expect(out).toMatch(/Kembali\s+10\.000/);
    expect(out).toContain('15/08/2026 19:42');
  });

  // Squeezing a long name and a price onto one line truncates the name, and
  // the name is what the customer checks.
  it('gives the item name its own line, with quantity indented below', () => {
    const lines = render({
      sale: sale(),
      lines: [line({ name: 'Minyak goreng sawit 1 L' })],
      shop,
      profile: 'kelontong',
    });
    expect(lines).toContain('Minyak goreng sawit 1 L');
    expect(lines.some((l) => /^ {2}2 x 15\.000\s+30\.000$/.test(l))).toBe(true);
  });

  it('prints only the modifiers that were chosen', () => {
    const out = render({
      sale: sale(),
      lines: [line({ modifiers: [{ name: 'Telur', price: 5000 }] })],
      shop,
      profile: 'warungMakan',
    }).join('\n');
    expect(out).toMatch(/\+ Telur\s+10\.000/); // 5.000 each, on a line of two
    expect(out).not.toContain('Bungkus');
  });

  // A cart seller pays for the paper out of a two thousand rupiah sale.
  it('gives a kaki lima seller a short slip, not a twenty-line receipt', () => {
    const panjang = render({
      sale: sale(),
      lines: [line()],
      shop,
      profile: 'kelontong',
    }).length;
    const pendek = render({
      sale: sale(),
      lines: [line()],
      shop,
      profile: 'kakiLima',
    });

    expect(pendek.length).toBeLessThan(panjang);
    expect(pendek.join('\n')).toContain('Warung Bu Ani');
    expect(pendek.join('\n')).not.toContain('Jl. Melati 12');
  });

  it('shows what is still owed on an utang sale, and who owes it', () => {
    const out = render({
      sale: sale({ total: 40000, payment: { method: 'utang', paid: 15000, change: 0 } }),
      lines: [line()],
      shop,
      profile: 'kelontong',
      customer: { name: 'Bu Sri' },
    }).join('\n');

    expect(out).toContain('Nama: Bu Sri');
    expect(out).toMatch(/Utang\s+15\.000/);
    expect(out).toMatch(/Sisa utang\s+25\.000/);
  });

  // A receipt that prints the same number twice invites the customer to hunt
  // for the difference between them.
  it('leaves out subtotal, discount and rounding when nothing moved', () => {
    const out = render({ sale: sale(), lines: [line()], shop, profile: 'kelontong' }).join('\n');
    expect(out).not.toContain('Subtotal');
    expect(out).not.toContain('Diskon');
    expect(out).not.toContain('Pembulatan');
  });

  it('shows the whole chain once something did move', () => {
    const out = render({
      sale: sale({ subtotal: 41500, discount: 2000, rounding: 500 }),
      lines: [line()],
      shop,
      profile: 'kelontong',
    }).join('\n');
    expect(out).toMatch(/Subtotal\s+41\.500/);
    expect(out).toMatch(/Diskon\s+-2\.000/);
    expect(out).toMatch(/Pembulatan\s+500/);
  });

  // A customer must never be handed the shop's margin.
  it('never prints the cost price', () => {
    const out = render({
      sale: sale(),
      lines: [line({ cost: 9000 })],
      shop,
      profile: 'kelontong',
    }).join('\n');
    expect(out).not.toContain('9.000');
  });

  it('doubles the height of the total and nothing else', () => {
    const built = buildReceipt({ sale: sale(), lines: [line()], shop, profile: 'kelontong' });
    const big = built.filter((l) => l.big);
    expect(big).toHaveLength(1);
    expect(big[0].text).toContain('TOTAL');
  });

  it('still produces a receipt for a shop that filled in nothing', () => {
    const lines = render({ sale: sale(), lines: [line()], shop: {}, profile: null });
    expect(lines.join('\n')).toContain('TOTAL');
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(WIDTH);
  });
});
