import { t } from '../strings/id.js';

/**
 * Counts, not money, so deliberately not the money Keypad: that one carries a
 * "000" key, and a stray tap on it turns a count of 5 into 5.000. Stock
 * arrives in twenties and fifties, so digits get typed, and the steppers cover
 * the last one or two.
 */
export default function QtyInput({ id, value, onChange, min = 0 }) {
  const step = (delta) => {
    navigator.vibrate?.(10);
    onChange(Math.max(min, value + delta));
  };

  return (
    <div className="qty">
      <button
        type="button"
        className="stepper__btn"
        aria-label={t.aksi.kurangi}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        id={id}
        className="input qty__input"
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        // Blank rather than a standing 0, so the first digit typed replaces it
        // instead of landing beside it.
        value={value === 0 ? '' : String(value)}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
      />
      <button
        type="button"
        className="stepper__btn"
        aria-label={t.aksi.tambah}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}
