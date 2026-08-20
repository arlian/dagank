import { useEffect } from 'react';
import { rupiah } from '../../domain/money.js';
import { t } from '../../strings/id.js';
import { IconCek } from './icons.jsx';

/**
 * How a sale ends. A shop still says "lunas" when a bill is settled, so the
 * word stays, and it doubles as the confirmation the cashier needs: the change
 * owed is the line underneath, which is the number they are about to count out
 * of the drawer.
 *
 * A sale left partly unpaid gets the opposite mark, in red, so the two are
 * impossible to confuse at a glance across a counter.
 */
export default function Stamp({ sale, onDone, onStruk }) {
  const lunas = (sale.payment?.paid ?? 0) >= sale.total;
  const kembalian = sale.payment?.change ?? 0;
  const kurang = Math.max(sale.total - (sale.payment?.paid ?? 0), 0);

  // Nothing was tendered on a QRIS or transfer sale, so neither "Kembalian"
  // nor "Uang pas" is true of it. Both would send the cashier to a drawer
  // that has no part in this sale.
  const nonTunai = sale.payment?.method === 'qris' || sale.payment?.method === 'transfer';
  const catatan = !lunas
    ? `${t.utang.totalUtang} ${rupiah(kurang)}`
    : nonTunai
      ? `${t.bayar[sale.payment.method]} · ${t.bayar.sudahDibayar}`
      : kembalian > 0
        ? `${t.bayar.kembalian} ${rupiah(kembalian)}`
        : t.bayar.uangPas;

  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    // Tapping anywhere dismisses it, so a queue never waits on an animation.
    <div className="stamp-layer" role="status" onClick={onDone}>
      <div className={`stamp ${lunas ? '' : 'stamp--utang'}`}>
        {lunas && <IconCek />}
        {lunas ? 'Lunas' : 'Utang'}
      </div>
      <div className="stamp__note">{catatan}</div>

      {/* Offered, never imposed: most sales here want no paper, so the sale
          flow gains no tap. Taking it up cancels the dismissal, because the
          receipt outliving the stamp by 1.4 seconds is the whole point. */}
      <button
        className="btn btn--block btn--lg stamp__struk"
        onClick={(e) => {
          e.stopPropagation();
          onStruk();
        }}
      >
        {t.struk.lihat}
      </button>
    </div>
  );
}
