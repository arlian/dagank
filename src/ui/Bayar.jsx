import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { calcSale, changeDue, outstanding } from '../domain/sale.js';
import { rupiah } from '../domain/money.js';
import { recordSale } from '../data/sales.js';
import { listCustomers, createCustomer } from '../data/customers.js';
import { t } from '../strings/id.js';
import { useSettings } from './settings-context.jsx';
import Keypad from './components/Keypad.jsx';

// Quick amounts remove most of the typing from the payment step. The set is
// tuned to the profile's typical transaction value.
const QUICK = {
  kelontong: [5000, 10000, 20000, 50000, 100000],
  warungMakan: [10000, 20000, 50000, 100000],
  kakiLima: [2000, 5000, 10000, 20000, 50000],
  jasa: [10000, 20000, 50000, 100000],
};

// Cash first: it is still most sales, and it is the only one that needs the
// keypad. Utang last, since it is the exception and is gated on a flag.
const METHODS = [
  { key: 'tunai' },
  { key: 'qris' },
  { key: 'transfer' },
  { key: 'utang' },
];

export default function Bayar({ lines, onClose, onDone }) {
  const { settings } = useSettings();
  const totals = calcSale({ lines, rounding: settings.rounding });

  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState('tunai');
  const [customerId, setCustomerId] = useState(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [lihatQris, setLihatQris] = useState(false);

  const customers = useLiveQuery(listCustomers, [], []);
  const quick = QUICK[settings.profile] ?? QUICK.kelontong;
  const kurang = outstanding(totals.total, paid);

  // QRIS and transfer are settled in full outside the drawer. There is no
  // tendered amount to enter and no change to give, so the keypad is absent
  // rather than shown with the total already filled in.
  const nonTunai = method === 'qris' || method === 'transfer';
  const dibayar = nonTunai ? totals.total : paid;

  const submit = async () => {
    if (method === 'utang' && !customerId) return setError(t.error.pelangganKosong);
    setBusy(true);
    try {
      const sale = await recordSale({
        lines,
        rounding: settings.rounding,
        // The tendered amount is recorded as given, not clamped to the total,
        // so the receipt and the day's cash both reconcile.
        payment: { method, paid: dibayar },
        customerId: method === 'utang' ? customerId : null,
      });
      onDone(sale);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const addCustomer = async () => {
    if (!newName.trim()) return setError(t.error.namaPelangganKosong);
    const customer = await createCustomer({ name: newName });
    setCustomerId(customer.id);
    setNewName('');
    setError(null);
  };

  return (
    <>
      {/* Full screen, above the payment sheet: the phone gets turned around
          and handed across the counter, so nothing else may share the glass.
          Dismissed only by the button -- a stray tap while the customer is
          lining up their camera must not close it. */}
      {lihatQris && settings.qris && (
        <div className="qris" role="dialog" aria-label={t.bayar.qrisJudul}>
          <p className="qris__judul">{t.bayar.qrisJudul}</p>
          <img className="qris__gambar" src={settings.qris} alt={t.pengaturan.qris} />
          <p className="qris__total">{rupiah(totals.total)}</p>
          <button className="btn btn--block btn--lg" onClick={() => setLihatQris(false)}>
            {t.aksi.tutup}
          </button>
        </div>
      )}

      <div className="sheet" role="dialog" aria-label={t.bayar.judul}>
        <div className="sheet__panel">
          <div className="row row--between">
            <h2>{t.bayar.judul}</h2>
            <button className="btn" onClick={onClose}>
              {t.aksi.batal}
            </button>
          </div>

          <div className="stat stat--total">
            <span>{t.bayar.total}</span>
            <span className="big">{rupiah(totals.total)}</span>
          </div>

          {/* Wraps to two rows rather than shrinking, because a payment method
              picked by mistake is a drawer that will not balance at closing. */}
          <div className="metode">
            {METHODS.filter((m) => m.key !== 'utang' || settings.features.utang).map((m) => (
              <button
                key={m.key}
                className={`btn ${method === m.key ? 'btn--primary' : ''}`}
                aria-pressed={method === m.key}
                onClick={() => setMethod(m.key)}
              >
                {t.bayar[m.key]}
              </button>
            ))}
          </div>

          {method === 'tunai' && (
            <>
              <div className="stat">
                <span>{t.bayar.uangDiterima}</span>
                <span className="stat__value">{rupiah(paid)}</span>
              </div>

              <div className="quick">
                <button className="btn" onClick={() => setPaid(totals.total)}>
                  {t.bayar.uangPas}
                </button>
                {quick.map((amount) => (
                  <button key={amount} className="btn" onClick={() => setPaid(amount)}>
                    {rupiah(amount)}
                  </button>
                ))}
              </div>

              <Keypad value={paid} onChange={setPaid} />

              <div className="stat">
                <span className="strong">
                  {paid >= totals.total ? t.bayar.kembalian : t.bayar.kurang}
                </span>
                <span className="big">
                  {rupiah(paid >= totals.total ? changeDue(totals.total, paid) : kurang)}
                </span>
              </div>
            </>
          )}

          {nonTunai && (
            <>
              <div className="stat">
                <span>{t.bayar.sudahDibayar}</span>
                <span className="big">{rupiah(totals.total)}</span>
              </div>
              <p className="muted">{t.bayar.nonTunaiPetunjuk}</p>

              {method === 'qris' && settings.qris && (
                <button className="btn btn--block btn--lg" onClick={() => setLihatQris(true)}>
                  {t.bayar.tunjukkanQris}
                </button>
              )}
            </>
          )}

          {method === 'utang' && (
            <>
              <div className="field">
                <span className="field__label">{t.bayar.pilihPelanggan}</span>
                <select
                  className="input"
                  value={customerId ?? ''}
                  onChange={(e) => setCustomerId(e.target.value || null)}
                >
                  <option value="">—</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <input
                  className="input"
                  placeholder={t.utang.namaPelanggan}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button className="btn" onClick={addCustomer}>
                  {t.aksi.tambah}
                </button>
              </div>

              <div className="stat">
                <span>{t.bayar.uangDiterima}</span>
                <span className="stat__value">{rupiah(paid)}</span>
              </div>
              <Keypad value={paid} onChange={setPaid} />
              <div className="stat">
                <span className="strong">{t.utang.totalUtang}</span>
                <span className="big">{rupiah(kurang)}</span>
              </div>
            </>
          )}

          {error && <span className="error">{error}</span>}

          <button
            className="btn btn--primary btn--block btn--pay"
            disabled={busy || (method === 'tunai' && paid < totals.total)}
            onClick={submit}
          >
            {t.bayar.selesai}
          </button>
        </div>
      </div>
    </>
  );
}
