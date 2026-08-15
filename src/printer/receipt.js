// The receipt as an array of lines. Pure: no bytes, no Bluetooth, no DOM.
//
// This is the layer everything else reads from. The same array becomes ESC/POS
// bytes for a thermal printer, plain text for a WhatsApp share, and the
// on-screen preview, so a shop with no printer still gets a struk and the
// three can never drift apart.

import { angka } from '../domain/money.js';

/** 58mm at Font A. Not 40, not 48. Every layout rule here follows from it. */
export const WIDTH = 32;

export const divider = (ch = '-', w = WIDTH) => ch.repeat(w);

export const center = (text, w = WIDTH) => {
  const s = text.slice(0, w);
  return ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
};

/**
 * A label on the left and an amount at the paper edge. The amount is never
 * truncated -- it is the part that has to be right -- so a long label gives
 * way instead.
 */
export const leftRight = (left, right, w = WIDTH) => {
  const r = String(right);
  const room = Math.max(0, w - r.length - 1);
  const l = String(left).slice(0, room);
  return l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;
};

/** "15/08/2026 19:42", fixed width so the header columns never move. */
const stamp = (ts) => {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * A short reference a customer can quote back. The full ULID is 26 characters
 * of machine detail nobody will ever read aloud across a counter.
 */
export const shortRef = (id) => `#${String(id).slice(-4).toUpperCase()}`;

const text = (s, style = {}) => ({ text: s, ...style });

const METHOD = { tunai: 'Tunai', utang: 'Utang', transfer: 'Transfer', qris: 'QRIS' };

/**
 * @param sale     the stored sale record
 * @param lines    its saleLines, already snapshotted with name and price
 * @param shop     { namaUsaha, alamat, telepon }
 * @param profile  business profile, which decides the receipt's shape
 * @param customer optional, for an utang sale
 */
export function buildReceipt({ sale, lines = [], shop = {}, profile = null, customer = null } = {}) {
  const out = [];

  // Header. A cart seller pays for the paper out of a two thousand rupiah
  // sale, so their slip gets the name and nothing else.
  if (shop.namaUsaha) out.push(text(center(shop.namaUsaha), { bold: true }));
  if (profile !== 'kakiLima') {
    if (shop.alamat) out.push(text(center(shop.alamat)));
    if (shop.telepon) out.push(text(center(shop.telepon)));
  }

  out.push(text(divider()));
  out.push(text(`No  : ${shortRef(sale.id)}`));
  out.push(text(`Tgl : ${stamp(sale.createdAt)}`));
  if (customer?.name) out.push(text(`Nama: ${customer.name}`.slice(0, WIDTH)));
  out.push(text(divider()));

  if (profile === 'kakiLima') {
    // Minimal slip: what was bought, in one line each, and the total.
    for (const line of lines) {
      out.push(text(leftRight(`${line.qty}x ${line.name}`, angka(subtotal(line)))));
    }
  } else {
    for (const line of lines) {
      // The name gets its own line. Squeezing a long product name and a price
      // onto 32 characters truncates the name, and the name is what the
      // customer checks.
      out.push(text(line.name.slice(0, WIDTH)));

      const unit = line.unit ? ` ${line.unit}` : '';
      out.push(
        text(leftRight(`  ${line.qty}${unit} x ${angka(line.price)}`, angka(line.qty * line.price))),
      );

      // Only what was actually chosen, never the whole menu of add-ons.
      for (const mod of line.modifiers ?? []) {
        out.push(text(leftRight(`  + ${mod.name}`, angka((mod.price || 0) * line.qty))));
      }
    }
  }

  out.push(text(divider()));

  // Only worth a row when something moved between it and the total. On a plain
  // sale the subtotal repeats the total, and a receipt that says the same
  // number twice invites the customer to look for the difference.
  if (sale.discount || sale.rounding) {
    out.push(text(leftRight('Subtotal', angka(sale.subtotal))));
    if (sale.discount) out.push(text(leftRight('Diskon', angka(-sale.discount))));
    if (sale.rounding) out.push(text(leftRight('Pembulatan', angka(sale.rounding))));
  }

  // Doubled in height only, never in width: double width halves the line to 16
  // characters and the amount would fall off the paper.
  out.push(text(leftRight('TOTAL', angka(sale.total)), { bold: true, big: true }));

  const paid = sale.payment?.paid ?? 0;
  const method = METHOD[sale.payment?.method] ?? 'Tunai';
  out.push(text(leftRight(method, angka(paid))));

  const kurang = sale.total - paid;
  if (kurang > 0) out.push(text(leftRight('Sisa utang', angka(kurang)), { bold: true }));
  else if (sale.payment?.change) {
    out.push(text(leftRight('Kembali', angka(sale.payment.change))));
  }

  out.push(text(divider()));
  out.push(text(center('Terima kasih')));

  return out;
}

const subtotal = (line) =>
  Math.round(
    (line.price + (line.modifiers ?? []).reduce((s, m) => s + (m.price || 0), 0)) * line.qty,
  );

/** The same lines as plain text, for a WhatsApp share or a clipboard copy. */
export const toText = (lines) => lines.map((l) => l.text.trimEnd()).join('\n');
