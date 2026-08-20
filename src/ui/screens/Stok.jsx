import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  allStock,
  listItems,
  movementsFor,
  recordOpname,
  recordPurchase,
  recordWaste,
} from '../../data/items.js';
import { stockList } from '../../domain/stock.js';
import { t, tanggal } from '../../strings/id.js';
import QtyInput from '../components/QtyInput.jsx';

/**
 * Stock only ever moved on the way out before this screen existed: sales
 * decremented it and nothing put it back, so the count went wrong on the first
 * kulakan run and stayed wrong. Three ways in, all appended as movements:
 * barang masuk, stok opname, barang rusak.
 */
export default function Stok({ onClose }) {
  const [open, setOpen] = useState(null);

  const items = useLiveQuery(listItems, [], []);
  const stock = useLiveQuery(allStock, [], new Map());
  const rows = stockList(items, stock);

  return (
    <div className="sheet" role="dialog" aria-label={t.stok.judul}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{t.stok.judul}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.tutup}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <p>
              {t.stok.kosong}
              <br />
              {t.stok.kosongPetunjuk}
            </p>
          </div>
        ) : (
          <div className="list">
            {rows.map(({ item, count, warn }) => (
              <button
                key={item.id}
                className="list__item"
                onClick={() => setOpen(item)}
              >
                <span className="line__main">
                  <span className="strong">{item.name}</span>
                  {warn && (
                    <>
                      <br />
                      {/* Colour is never the only signal, so the word is here. */}
                      <span
                        className={`badge badge--${warn === 'menipis' ? 'warn' : 'danger'}`}
                      >
                        {warn === 'menipis' ? t.barang.menipis : t.barang.habis}
                      </span>
                    </>
                  )}
                </span>
                <span className="stat__value">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <StokBarang
          item={open}
          sekarang={stock.get(open.id) ?? 0}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

const MODES = ['purchase', 'adjustment', 'waste'];

const LABEL = {
  purchase: t.stok.masuk,
  adjustment: t.stok.opname,
  waste: t.stok.rusak,
};

const HINT = {
  purchase: t.stok.masukPetunjuk,
  adjustment: t.stok.opnamePetunjuk,
  waste: t.stok.rusakPetunjuk,
};

/** What the count becomes if this is saved. Shown before saving, never after. */
const hasil = (mode, sekarang, qty) =>
  mode === 'adjustment' ? qty : mode === 'waste' ? sekarang - qty : sekarang + qty;

function StokBarang({ item, sekarang, onClose }) {
  const [mode, setMode] = useState('purchase');
  const [qty, setQty] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const riwayat = useLiveQuery(() => movementsFor(item.id), [item.id], []);
  const jadi = hasil(mode, sekarang, qty);

  const simpan = async () => {
    // Opname legitimately counts a shelf down to zero, so only the two that
    // describe a movement need a quantity.
    if (!qty && mode !== 'adjustment') return setError(t.error.jumlahKosong);

    const catatan = note.trim() || null;
    if (mode === 'purchase') await recordPurchase(item.id, qty, catatan);
    else if (mode === 'waste') await recordWaste(item.id, qty, catatan);
    else await recordOpname(item.id, qty);

    navigator.vibrate?.(30);
    onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-label={item.name}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{item.name}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.tutup}
          </button>
        </div>

        <div className="stat">
          <span>{t.stok.sekarang}</span>
          <span className="big">{sekarang}</span>
        </div>

        <div className="chips" style={{ padding: 0 }}>
          {MODES.map((key) => (
            <button
              key={key}
              className="chip chip--besar"
              aria-pressed={mode === key}
              onClick={() => {
                setMode(key);
                // The number means something different under each mode, and
                // carrying it across is how a count of 12 becomes 12 wasted.
                setQty(0);
                setError(null);
              }}
            >
              {LABEL[key]}
            </button>
          ))}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="jumlahStok">
            {t.stok.jumlah}
          </label>
          <QtyInput id="jumlahStok" value={qty} onChange={setQty} />
          <span className="field__hint">{HINT[mode]}</span>
        </div>

        {mode === 'adjustment' && qty !== sekarang && (
          <div className="stat">
            <span>{t.stok.selisih}</span>
            <span className="stat__value">
              {qty - sekarang > 0 ? '+' : ''}
              {qty - sekarang}
            </span>
          </div>
        )}

        {/* Opname records what was counted and what the app believed, which is
            the note. The other two need one, since "kulakan" and "tikus" are
            the reason anybody reads this list later. */}
        {mode !== 'adjustment' && (
          <div className="field">
            <label className="field__label" htmlFor="catatanStok">
              {t.stok.catatan}
            </label>
            <input
              id="catatanStok"
              className="input"
              autoComplete="off"
              placeholder={t.stok.catatanPetunjuk}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        {error && <span className="error">{error}</span>}

        <div className="stat stat--total">
          <span>{t.stok.jadi(jadi)}</span>
        </div>

        <button className="btn btn--primary btn--block btn--lg" onClick={simpan}>
          {t.aksi.simpan}
        </button>

        <div className="field">
          <span className="field__label">{t.stok.riwayat}</span>
          {riwayat.length === 0 ? (
            <p className="muted">{t.stok.belumAdaRiwayat}</p>
          ) : (
            <div className="list">
              {riwayat.map((m) => (
                <div key={m.id} className="list__item">
                  <span className="line__main">
                    <span>{t.stok.tipe[m.type] ?? m.type}</span>
                    <br />
                    <span className="muted">
                      {tanggal(m.createdAt)}
                      {m.note && ` · ${m.note}`}
                    </span>
                  </span>
                  <span className="strong">
                    {m.qty > 0 ? '+' : ''}
                    {m.qty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
