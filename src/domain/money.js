// Money is an integer number of rupiah. Never a float, never cents.

const plain = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/**
 * "Rp12.500". Built by hand rather than with `style: 'currency'`, because
 * that inserts a space whose presence and width vary by ICU version, which
 * differs across the Android WebViews this runs on and would shift the
 * 32-character receipt columns.
 */
export const rupiah = (n) => {
  const value = Math.round(n || 0);
  return value < 0 ? `-Rp${angka(-value)}` : `Rp${angka(value)}`;
};

/** "12.500", for input fields where the Rp is already on screen. */
export const angka = (n) => plain.format(Math.round(n || 0));

/** Read digits the user typed back into an integer. "12.500" -> 12500 */
export const parseRupiah = (text) => {
  const digits = String(text ?? '').replace(/\D/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
};

export const ROUNDING_MODES = ['none', 100, 500];

/**
 * Rounding applies to the transaction total only, never to line items.
 * Returns the adjustment, which is recorded in its own field so the
 * numbers still reconcile: subtotal - discount + rounding = total.
 */
export function roundingAdjustment(amount, mode = 'none') {
  if (mode === 'none' || !mode) return 0;
  const step = Number(mode);
  if (!Number.isFinite(step) || step <= 0) return 0;
  return Math.round(amount / step) * step - amount;
}
