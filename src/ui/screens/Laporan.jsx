import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db.js';
import { linesForSales, salesBetween, voidSale } from '../../data/sales.js';
import { expensesBetween } from '../../data/expenses.js';
import { bestSellers, byDay, dailyRecap, rangeBounds } from '../../domain/report.js';
import { rupiah } from '../../domain/money.js';
import { t, jam, tanggal } from '../../strings/id.js';
import { useSettings } from '../settings-context.jsx';
import Kas from '../Kas.jsx';
import Pengeluaran from '../Pengeluaran.jsx';
import Struk from '../Struk.jsx';

// Three windows, not a date picker. Picking an arbitrary day is a rare need
// and a slow control; "how did the week go" is the question that actually gets
// asked, and it is one tap away.
const RENTANG = [
  { days: 1, label: 'hariIni' },
  { days: 7, label: 'tujuhHari' },
  { days: 30, label: 'tigaPuluhHari' },
];

// A month of a busy warung is thousands of rows, and nobody scrolls them. The
// recap above is the answer for a wide window; the list is for finding the
// receipt from this morning.
const MAX_BARIS = 50;

export default function Laporan() {
  const { settings } = useSettings();
  const { features } = settings;
  const [struk, setStruk] = useState(null);
  const [days, setDays] = useState(1);

  const data = useLiveQuery(
    async () => {
      const { start, end } = rangeBounds(days);
      const sales = await salesBetween(start, end);
      const linesBySale = await linesForSales(sales.map((s) => s.id));
      const ledger = await db.ledger
        .where('createdAt')
        .between(start, end, true, false)
        .toArray();
      const expenses = await expensesBetween(start, end);
      return { sales, linesBySale, ledger, expenses };
    },
    [days],
    null,
  );

  if (!data) return null;

  const { sales, linesBySale, ledger, expenses } = data;
  const recap = dailyRecap({ sales, linesBySale, ledger, expenses });
  const done = sales.filter((s) => s.status === 'selesai');
  const soldLines = done.flatMap((s) => linesBySale.get(s.id) ?? []);
  const top = bestSellers(soldLines);
  const harian = byDay(sales);
  const hariIni = days === 1;
  const daftar = [...sales].reverse().slice(0, MAX_BARIS);

  const batalkan = async (sale) => {
    if (!window.confirm(`${t.laporan.batal} ${rupiah(sale.total)}?`)) return;
    await voidSale(sale.id);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <h1>{t.laporan.judul}</h1>
      </div>

      <div className="chips">
        {RENTANG.map((r) => (
          <button
            key={r.days}
            className="chip chip--besar"
            aria-pressed={days === r.days}
            onClick={() => setDays(r.days)}
          >
            {t.laporan[r.label]}
          </button>
        ))}
      </div>

      <div className="body">
        {/* Both are today's tools: a drawer is counted now, and an expense is
            written down when it happens. Neither belongs under a window that
            reaches back a month, so they step aside rather than mislead. */}
        {hariIni && <Kas />}

        {sales.length === 0 ? (
          <div className="empty">
            <p>{hariIni ? t.laporan.kosong : t.laporan.kosongRentang}</p>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="stat">
                <span>{t.laporan.penjualan}</span>
                <span className="big">{rupiah(recap.penjualan)}</span>
              </div>
              <div className="stat">
                <span>{t.laporan.transaksi}</span>
                <span className="stat__value">{recap.transaksi}</span>
              </div>
              <div className="stat">
                <span>{t.laporan.tunai}</span>
                <span className="stat__value">{rupiah(recap.tunai)}</span>
              </div>

              {/* Only once there is some. A cash-only shop should not have to
                  read past a row saying nol every single day -- but the day a
                  QRIS sale happens, the gap between Penjualan and Tunai needs
                  explaining, and this is the row that explains it. */}
              {recap.nonTunai > 0 && (
                <div className="stat">
                  <span>{t.laporan.nonTunai}</span>
                  <span className="stat__value">{rupiah(recap.nonTunai)}</span>
                </div>
              )}

              {/* Absent, not shown as an empty row, when the shop does not
                  track cost. */}
              {features.modal && (
                <div className="stat">
                  <span>{t.laporan.laba}</span>
                  <span className="stat__value">
                    {recap.laba == null ? (
                      <span className="muted">{t.laporan.labaKosong}</span>
                    ) : (
                      rupiah(recap.laba)
                    )}
                  </span>
                </div>
              )}

              {/* Both absent until there is something to say, so a shop that
                  never records an expense keeps the short recap it had. */}
              {recap.pengeluaran > 0 && (
                <div className="stat">
                  <span>{t.laporan.pengeluaran}</span>
                  <span className="stat__value">−{rupiah(recap.pengeluaran)}</span>
                </div>
              )}
              {features.modal && recap.sisa != null && recap.pengeluaran > 0 && (
                <div className="stat">
                  <span className="strong">{t.laporan.sisa}</span>
                  <span className="stat__value">{rupiah(recap.sisa)}</span>
                </div>
              )}

              {features.utang && (
                <>
                  <div className="stat">
                    <span>{t.laporan.utangBaru}</span>
                    <span className="stat__value">{rupiah(recap.utangBaru)}</span>
                  </div>
                  <div className="stat">
                    <span>{t.laporan.pembayaranUtang}</span>
                    <span className="stat__value">{rupiah(recap.pembayaranUtang)}</span>
                  </div>
                </>
              )}
            </div>

            {/* The point of a wider window: which days were good. One total for
                a whole month says nothing an owner can act on. */}
            {!hariIni && harian.length > 0 && (
              <div className="card">
                <div className="row row--between">
                  <h2>{t.laporan.perHari}</h2>
                  <span className="muted">
                    {t.laporan.rataRata} {rupiah(Math.round(recap.penjualan / days))}
                  </span>
                </div>
                {harian.map((d) => (
                  <div key={d.day} className="stat">
                    <span>
                      {tanggal(d.day)}
                      <br />
                      <span className="muted">
                        {d.transaksi} {t.laporan.transaksi.toLowerCase()}
                      </span>
                    </span>
                    <span className="stat__value">{rupiah(d.penjualan)}</span>
                  </div>
                ))}
              </div>
            )}

            {top.length > 0 && (
              <div className="card">
                <h2>{t.laporan.terlaris}</h2>
                {top.map((item) => (
                  <div key={item.itemId} className="stat">
                    <span>{item.name}</span>
                    <span className="stat__value">{item.qty}</span>
                  </div>
                ))}
              </div>
            )}

            {sales.length > MAX_BARIS && (
              <p className="muted muted--sisip">{t.laporan.terbaru(MAX_BARIS)}</p>
            )}

            <div className="list">
              {daftar.map((sale) => (
                <div key={sale.id} className="list__item">
                  {/* The row opens its struk, which is how a reprint happens.
                      Its own button rather than the whole row, so Batal stays a
                      separate target and cannot be hit by accident. */}
                  <button className="list__buka" onClick={() => setStruk(sale)}>
                    <span className="strong">{rupiah(sale.total)}</span>
                    {sale.status === 'batal' && (
                      <span className="badge badge--danger"> {t.laporan.batal}</span>
                    )}
                    <br />
                    <span className="muted">
                      {/* The date joins the time as soon as the window covers
                          more than one day, or "14:05" names no moment. */}
                      {hariIni ? '' : `${tanggal(sale.createdAt)} · `}
                      {jam(sale.createdAt)} ·{' '}
                      {(linesBySale.get(sale.id) ?? []).length} item · {t.struk.lihat}
                    </span>
                  </button>
                  {sale.status === 'selesai' && (
                    <button className="btn btn--danger" onClick={() => batalkan(sale)}>
                      {t.aksi.batal}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {hariIni && <Pengeluaran />}
      </div>

      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}
    </div>
  );
}
