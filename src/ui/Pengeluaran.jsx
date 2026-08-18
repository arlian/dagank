import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  EXPENSE_CATEGORIES,
  expensesOn,
  recordExpense,
  voidExpense,
} from '../data/expenses.js';
import { expenseTotal } from '../domain/report.js';
import { rupiah } from '../domain/money.js';
import { t, jam } from '../strings/id.js';
import { useSettings } from './settings-context.jsx';
import Keypad from './Keypad.jsx';

/**
 * What went out of the shop today. Lives on Laporan next to Kas, for the same
 * reason: it is a few taps a day, not a step in the sale flow, and nothing
 * here may cost the cashier a tap at the counter.
 *
 * Unlike most cards this one shows even on a day with no sales -- the morning
 * shopping run happens before the first customer does.
 */
export default function Pengeluaran() {
  const [sheet, setSheet] = useState(false);
  const expenses = useLiveQuery(() => expensesOn(), [], []);

  const aktif = expenses.filter((e) => e.status !== 'batal');
  const total = expenseTotal(expenses);

  return (
    <>
      <div className="card stack">
        <div className="row row--between">
          <h2>{t.pengeluaran.judul}</h2>
          {total > 0 && <span className="strong">{rupiah(total)}</span>}
        </div>

        {aktif.length === 0 ? (
          <p className="muted">{t.pengeluaran.kosong}</p>
        ) : (
          <div className="lines">
            {[...aktif].reverse().map((e) => (
              <Baris key={e.id} expense={e} />
            ))}
          </div>
        )}

        <button className="btn btn--block" onClick={() => setSheet(true)}>
          {t.pengeluaran.catat}
        </button>
      </div>

      {sheet && <CatatPengeluaran onClose={() => setSheet(false)} />}
    </>
  );
}

function Baris({ expense }) {
  const batalkan = async () => {
    if (!window.confirm(t.pengeluaran.batalkan)) return;
    await voidExpense(expense.id);
  };

  return (
    <div className="line">
      <div className="line__main">
        <span className="line__name">{t.pengeluaran.kategori[expense.category]}</span>
        <span className="line__sub">
          {jam(expense.createdAt)}
          {expense.note ? ` · ${expense.note}` : ''}
          {/* Named, not just implied by the missing subtraction: a bill paid
              by transfer is still money gone, it simply never sat in the
              drawer the cashier is about to count. */}
          {expense.dariLaci ? '' : ` · ${t.pengeluaran.dariLuar}`}
        </span>
      </div>
      <span className="strong">{rupiah(expense.amount)}</span>
      <button className="btn" onClick={batalkan} aria-label={t.aksi.batal}>
        {t.aksi.batal}
      </button>
    </div>
  );
}

function CatatPengeluaran({ onClose }) {
  const { settings } = useSettings();
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('lain');
  const [note, setNote] = useState('');
  const [dariLaci, setDariLaci] = useState(true);
  const [error, setError] = useState(null);

  const simpan = async () => {
    try {
      await recordExpense({ amount, category, note, dariLaci });
      navigator.vibrate?.(30);
      onClose();
    } catch (err) {
      setError(t.error[err.message] ?? t.error.jumlahKosong);
    }
  };

  return (
    <div className="sheet" role="dialog" aria-label={t.pengeluaran.catat}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{t.pengeluaran.catat}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.batal}
          </button>
        </div>

        <div className="stat">
          <span>{t.pengeluaran.jumlah}</span>
          <span className="big">{rupiah(amount)}</span>
        </div>

        <Keypad value={amount} onChange={setAmount} />

        <div className="field">
          <span className="field__label">{t.pengeluaran.untukApa}</span>
          <div className="chips chips--bungkus">
            {EXPENSE_CATEGORIES.map((key) => (
              <button
                key={key}
                className="chip chip--besar"
                aria-pressed={category === key}
                onClick={() => setCategory(key)}
              >
                {t.pengeluaran.kategori[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Only where it can actually mislead: a shop that keeps cost prices
            is the only one at risk of counting a shopping run twice. */}
        {category === 'belanja' && settings.features.modal && (
          <p className="muted">{t.pengeluaran.modalPeringatan}</p>
        )}

        <div className="field">
          <label className="field__label" htmlFor="catatan-keluar">
            {t.pengeluaran.catatan}
          </label>
          <input
            id="catatan-keluar"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="field__hint">{t.pengeluaran.catatanPetunjuk}</span>
        </div>

        {/* Absent for a shop that never counts a drawer: without a kas awal
            and a kas akhir the distinction has nothing to change. */}
        {settings.features.shift && (
          <label className="switch">
            <span>{t.pengeluaran.dariLaci}</span>
            <input
              type="checkbox"
              checked={dariLaci}
              onChange={(e) => setDariLaci(e.target.checked)}
            />
          </label>
        )}

        {error && <span className="error">{error}</span>}

        <button className="btn btn--primary btn--block btn--lg" onClick={simpan}>
          {t.aksi.simpan}
        </button>
      </div>
    </div>
  );
}
