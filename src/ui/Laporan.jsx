import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db.js';
import { linesForSales, salesOn, voidSale } from '../data/sales.js';
import { bestSellers, dailyRecap, dayBounds } from '../domain/report.js';
import { rupiah } from '../domain/money.js';
import { t, jam } from '../strings/id.js';
import { useSettings } from './settings-context.jsx';
import Kas from './Kas.jsx';

export default function Laporan() {
  const { settings } = useSettings();
  const { features } = settings;

  const data = useLiveQuery(async () => {
    const sales = await salesOn();
    const linesBySale = await linesForSales(sales.map((s) => s.id));
    const { start, end } = dayBounds();
    const ledger = await db.ledger
      .where('createdAt')
      .between(start, end, true, false)
      .toArray();
    return { sales, linesBySale, ledger };
  }, [], null);

  if (!data) return null;

  const { sales, linesBySale, ledger } = data;
  const recap = dailyRecap({ sales, linesBySale, ledger });
  const done = sales.filter((s) => s.status === 'selesai');
  const soldLines = done.flatMap((s) => linesBySale.get(s.id) ?? []);
  const top = bestSellers(soldLines);

  const batalkan = async (sale) => {
    if (!window.confirm(`${t.laporan.batal} ${rupiah(sale.total)}?`)) return;
    await voidSale(sale.id);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <h1>{t.laporan.judul}</h1>
        <span className="topbar__sub">{t.laporan.hariIni}</span>
      </div>

      {/* Above the sales check on purpose: the drawer gets counted before the
          first sale of the day, which is exactly when there is nothing else
          on this screen. */}
      {sales.length === 0 ? (
        <div className="body">
          <Kas />
          <div className="empty">
            <p>{t.laporan.kosong}</p>
          </div>
        </div>
      ) : (
        <div className="body">
          <Kas />

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

          <div className="list">
            {[...sales].reverse().map((sale) => (
              <div key={sale.id} className="list__item">
                <span className="line__main">
                  <span className="strong">{rupiah(sale.total)}</span>
                  {sale.status === 'batal' && (
                    <span className="badge badge--danger"> {t.laporan.batal}</span>
                  )}
                  <br />
                  <span className="muted">
                    {jam(sale.createdAt)} ·{' '}
                    {(linesBySale.get(sale.id) ?? []).length} item
                  </span>
                </span>
                {sale.status === 'selesai' && (
                  <button className="btn btn--danger" onClick={() => batalkan(sale)}>
                    {t.aksi.batal}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
