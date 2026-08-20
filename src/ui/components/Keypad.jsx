import { t } from '../../strings/id.js';

// A custom keypad rather than the system keyboard: large keys, no autocorrect,
// no accidental letters, and a "000" key, which matters enormously with rupiah.
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];

export default function Keypad({ value, onChange }) {
  const press = (key) => {
    navigator.vibrate?.(10);
    if (key === '⌫') return onChange(Math.floor(value / 10));
    const next = Number(`${value}${key}`);
    // A rupiah amount past a billion is a mis-tap, not a sale.
    if (next <= 9_999_999_999) onChange(next);
  };

  return (
    <div className="keypad">
      {KEYS.map((key) => (
        <button
          key={key}
          className="keypad__key"
          aria-label={key === '⌫' ? t.aksi.hapus : key}
          onClick={() => press(key)}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
