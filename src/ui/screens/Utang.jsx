import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  createCustomer,
  entriesFor,
  getCustomer,
  outstandingCustomers,
  recordPayment,
  updateCustomer,
} from '../../data/customers.js';
import { balance, oldestDebtAge } from '../../domain/ledger.js';
import { rupiah } from '../../domain/money.js';
import { normalisePhone, waLink } from '../../domain/whatsapp.js';
import { t, tanggal } from '../../strings/id.js';
import { useSettings } from '../settings-context.jsx';
import Keypad from '../components/Keypad.jsx';

export default function Utang() {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  const customers = useLiveQuery(outstandingCustomers, [], []);
  const total = customers.reduce((sum, c) => sum + c.balance, 0);

  const addCustomer = async () => {
    if (!name.trim()) return setError(t.error.namaPelangganKosong);
    if (phone.trim() && !normalisePhone(phone)) return setError(t.utang.nomorWaSalah);
    await createCustomer({ name, phone: phone.trim() || null });
    setName('');
    setPhone('');
    setAdding(false);
    setError(null);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <div>
          <h1>{t.utang.judul}</h1>
          <div className="topbar__sub">
            {t.utang.totalUtang}: {rupiah(total)}
          </div>
        </div>
        <button className="btn" onClick={() => setAdding(true)}>
          + {t.utang.pelanggan}
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="empty">
          <p>
            {t.utang.kosong}
            <br />
            {t.utang.kosongPetunjuk}
          </p>
        </div>
      ) : (
        <div className="body">
          <div className="list">
            {customers.map((c) => (
              <button key={c.id} className="list__item" onClick={() => setOpen(c)}>
                <span className="line__main">
                  <span className="strong">{c.name}</span>
                  <br />
                  {/* Colour is never the only signal, so the word is here too. */}
                  <span className="badge badge--danger">{t.utang.belumLunas}</span>
                  {c.age != null && (
                    <span className="muted"> · {t.utang.sejak(c.age)}</span>
                  )}
                </span>
                <span className="strong">{rupiah(c.balance)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {adding && (
        <div className="sheet" role="dialog" aria-label={t.utang.tambahPelanggan}>
          <div className="sheet__panel">
            <div className="row row--between">
              <h2>{t.utang.tambahPelanggan}</h2>
              <button className="btn" onClick={() => setAdding(false)}>
                {t.aksi.batal}
              </button>
            </div>
            <input
              className="input"
              autoFocus
              placeholder={t.utang.namaPelanggan}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="field">
              <label className="field__label" htmlFor="nomor-wa-baru">
                {t.utang.nomorWa}
              </label>
              <input
                id="nomor-wa-baru"
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="0812 3456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="field__hint">{t.utang.nomorWaPetunjuk}</span>
            </div>
            {error && <span className="error">{error}</span>}
            <button className="btn btn--primary btn--block btn--lg" onClick={addCustomer}>
              {t.aksi.simpan}
            </button>
          </div>
        </div>
      )}

      {open && <DetailUtang customer={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DetailUtang({ customer: awal, onClose }) {
  const { settings } = useSettings();
  const [amount, setAmount] = useState(0);
  const entries = useLiveQuery(() => entriesFor(awal.id), [awal.id], []);
  // Live, so a number typed in below is picked up by the WhatsApp link.
  const customer = useLiveQuery(() => getCustomer(awal.id), [awal.id], awal);
  const sisa = balance(entries);

  const pesan = t.utang.pesanTagih({
    nama: customer.name,
    toko: settings.namaUsaha,
    sisa: rupiah(sisa),
    hari: oldestDebtAge(entries),
  });

  const pay = async () => {
    if (!amount) return;
    await recordPayment(customer.id, amount);
    setAmount(0);
    if (sisa - amount <= 0) onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-label={customer.name}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{customer.name}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.tutup}
          </button>
        </div>

        <div className="stat">
          <span>{t.utang.totalUtang}</span>
          <span className="big">{rupiah(sisa)}</span>
        </div>

        {sisa <= 0 ? (
          <span className="badge badge--ok">{t.utang.lunas}</span>
        ) : (
          <>
            {/* A plain link: the owner reads the message in WhatsApp and
                presses send there, so nothing leaves the phone unseen. */}
            <a
              className="btn btn--block"
              href={waLink(customer.phone, pesan)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.utang.tagihWa}
            </a>
            <NomorWa customer={customer} />
            <div className="stat">
              <span>{t.utang.jumlahBayar}</span>
              <span className="stat__value">{rupiah(amount)}</span>
            </div>
            <div className="row">
              <button className="btn spacer" onClick={() => setAmount(sisa)}>
                {t.utang.lunas}
              </button>
            </div>
            <Keypad value={amount} onChange={setAmount} />
            <button
              className="btn btn--primary btn--block btn--lg"
              disabled={!amount}
              onClick={pay}
            >
              {t.utang.bayar}
            </button>
          </>
        )}

        <div className="list">
          {[...entries].reverse().map((e) => (
            <div key={e.id} className="list__item">
              <span>
                {e.type === 'bayar' ? t.utang.bayar : t.utang.judul}
                <br />
                <span className="muted">{tanggal(e.createdAt)}</span>
              </span>
              <span className="strong">
                {e.type === 'bayar' ? '−' : '+'}
                {rupiah(e.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The number lives on the customer, but this is the moment someone wants it:
 * right before the first reminder. So it is filled in here, not on a separate
 * customer screen.
 */
function NomorWa({ customer }) {
  const [value, setValue] = useState(customer.phone ?? '');
  const [error, setError] = useState(null);
  const tersimpan = (customer.phone ?? '') === value.trim();

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed && !normalisePhone(trimmed)) return setError(t.utang.nomorWaSalah);
    await updateCustomer(customer.id, { phone: trimmed || null });
    setError(null);
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor="nomor-wa">
        {t.utang.nomorWa}
      </label>
      <div className="row">
        <input
          id="nomor-wa"
          className="input spacer"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0812 3456 7890"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {!tersimpan && (
          <button className="btn" onClick={save}>
            {t.aksi.simpan}
          </button>
        )}
      </div>
      {error ? (
        <span className="error">{error}</span>
      ) : (
        !customer.phone && <span className="field__hint">{t.utang.nomorWaPetunjuk}</span>
      )}
    </div>
  );
}
