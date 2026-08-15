import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  closeShift,
  currentShift,
  openShift,
  recentShifts,
  shiftTotals,
} from '../data/shifts.js';
import { rupiah } from '../domain/money.js';
import { t, jam, tanggal } from '../strings/id.js';
import { useSettings } from './settings-context.jsx';
import Keypad from './Keypad.jsx';

/**
 * Kas awal at open, kas akhir counted at close, and the selisih between what
 * is in the drawer and what should be. Lives on Laporan rather than on Kasir:
 * it is a start-of-day and end-of-day action, and putting it anywhere near the
 * pay button would cost a tap on every sale to save two a day.
 */
export default function Kas() {
  const { settings } = useSettings();
  const [sheet, setSheet] = useState(null);

  const shift = useLiveQuery(currentShift, [], undefined);
  const totals = useLiveQuery(
    () => (shift ? shiftTotals(shift) : null),
    [shift?.id, shift?.openedAt],
    null,
  );
  const history = useLiveQuery(recentShifts, [], []);

  // Absent, not disabled, for a cart seller who has no drawer to count.
  if (!settings.features.shift) return null;
  if (shift === undefined) return null;

  return (
    <>
      <div className="card stack">
        <div className="row row--between">
          <h2>{t.kas.judul}</h2>
          {shift && <span className="muted">{t.kas.sedangBuka(jam(shift.openedAt))}</span>}
        </div>

        {shift ? (
          <>
            <div className="stat">
              <span>{t.kas.kasAwal}</span>
              <span className="stat__value">{rupiah(shift.kasAwal)}</span>
            </div>
            <div className="stat">
              <span>{t.kas.tunaiMasuk}</span>
              <span className="stat__value">{rupiah(totals?.tunai ?? 0)}</span>
            </div>
            {settings.features.utang && (
              <div className="stat">
                <span>{t.kas.utangMasuk}</span>
                <span className="stat__value">{rupiah(totals?.pembayaranUtang ?? 0)}</span>
              </div>
            )}
            <div className="stat stat--total">
              <span>{t.kas.seharusnya}</span>
              <span className="big">{rupiah(totals?.seharusnya ?? shift.kasAwal)}</span>
            </div>
            <button
              className="btn btn--primary btn--block btn--lg"
              onClick={() => setSheet('tutup')}
            >
              {t.kas.tutup}
            </button>
          </>
        ) : (
          <>
            <p className="muted">{t.kas.belumBuka}</p>
            <button
              className="btn btn--primary btn--block btn--lg"
              onClick={() => setSheet('buka')}
            >
              {t.kas.buka}
            </button>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="card">
          <h2>{t.kas.riwayat}</h2>
          {history.map((s) => (
            <div key={s.id} className="stat">
              <span>
                {tanggal(s.openedAt)}
                <br />
                <span className="muted">
                  {jam(s.openedAt)} – {jam(s.closedAt)}
                </span>
              </span>
              <Selisih value={s.selisih} />
            </div>
          ))}
        </div>
      )}

      {sheet === 'buka' && <BukaKas onClose={() => setSheet(null)} />}
      {sheet === 'tutup' && (
        <TutupKas shift={shift} totals={totals} onClose={() => setSheet(null)} />
      )}
    </>
  );
}

/** Colour is never the only signal, so the difference always carries its word. */
function Selisih({ value }) {
  if (value == null) return <span className="muted">—</span>;
  if (value === 0) return <span className="badge badge--ok">{t.kas.pas}</span>;

  return (
    <span className={`badge badge--${value < 0 ? 'danger' : 'warn'}`}>
      {value < 0 ? t.kas.kurang : t.kas.lebih} {rupiah(Math.abs(value))}
    </span>
  );
}

function BukaKas({ onClose }) {
  const [kasAwal, setKasAwal] = useState(0);

  return (
    <div className="sheet" role="dialog" aria-label={t.kas.buka}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{t.kas.buka}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.batal}
          </button>
        </div>

        <p className="muted">{t.kas.bukaPetunjuk}</p>

        <div className="stat">
          <span>{t.kas.kasAwal}</span>
          <span className="big">{rupiah(kasAwal)}</span>
        </div>

        <Keypad value={kasAwal} onChange={setKasAwal} />

        {/* An empty drawer is a real answer, so this never demands a figure. */}
        <button
          className="btn btn--primary btn--block btn--lg"
          onClick={async () => {
            await openShift(kasAwal);
            navigator.vibrate?.(30);
            onClose();
          }}
        >
          {t.aksi.simpan}
        </button>
      </div>
    </div>
  );
}

function TutupKas({ shift, totals, onClose }) {
  const [kasAkhir, setKasAkhir] = useState(0);

  const seharusnya = totals?.seharusnya ?? shift.kasAwal;
  const selisih = kasAkhir - seharusnya;

  return (
    <div className="sheet" role="dialog" aria-label={t.kas.tutup}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{t.kas.tutup}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.batal}
          </button>
        </div>

        <p className="muted">{t.kas.tutupPetunjuk}</p>

        <div className="stat">
          <span>{t.kas.seharusnya}</span>
          <span className="stat__value">{rupiah(seharusnya)}</span>
        </div>

        <div className="stat">
          <span>{t.kas.kasAkhir}</span>
          <span className="big">{rupiah(kasAkhir)}</span>
        </div>

        <Keypad value={kasAkhir} onChange={setKasAkhir} />

        {/* Named before saving, not after: the moment to recount is while the
            money is still in your hand. */}
        <div className="stat">
          <span className="strong">{t.kas.selisih}</span>
          <Selisih value={selisih} />
        </div>

        <button
          className="btn btn--primary btn--block btn--lg"
          onClick={async () => {
            await closeShift(shift.id, kasAkhir);
            navigator.vibrate?.(30);
            onClose();
          }}
        >
          {t.aksi.simpan}
        </button>
      </div>
    </div>
  );
}
