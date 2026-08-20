import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  createCustomer,
  entriesFor,
  outstandingCustomers,
  recordPayment,
} from '../data/customers.js';
import { balance } from '../domain/ledger.js';
import { rupiah } from '../domain/money.js';
import { t, tanggal } from '../strings/id.js';
import Keypad from './components/Keypad.jsx';

export default function Utang() {
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const customers = useLiveQuery(outstandingCustomers, [], []);
  const total = customers.reduce((sum, c) => sum + c.balance, 0);

  const addCustomer = async () => {
    if (!name.trim()) return setError(t.error.namaPelangganKosong);
    await createCustomer({ name });
    setName('');
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

function DetailUtang({ customer, onClose }) {
  const [amount, setAmount] = useState(0);
  const entries = useLiveQuery(() => entriesFor(customer.id), [customer.id], []);
  const sisa = balance(entries);

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
