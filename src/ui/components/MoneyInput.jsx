import { angka, parseRupiah } from '../../domain/money.js';

/**
 * Formats with thousand separators as the user types while keeping the stored
 * value an integer. Uses the system keyboard in `numeric` mode; the payment
 * step gets a custom keypad instead.
 */
export default function MoneyInput({ value, onChange, id, placeholder = '0', ...rest }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="strong" aria-hidden="true">
        Rp
      </span>
      <input
        {...rest}
        id={id}
        className="input input--money"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value ? angka(value) : ''}
        onChange={(e) => onChange(parseRupiah(e.target.value))}
      />
    </div>
  );
}
