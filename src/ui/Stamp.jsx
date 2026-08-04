import { useEffect } from 'react';
import { rupiah } from '../domain/money.js';
import { t } from '../strings/id.js';
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
export default function Stamp({ sale, onDone }) {
  const lunas = (sale.payment?.paid ?? 0) >= sale.total;
  const kembalian = sale.payment?.change ?? 0;
  const kurang = Math.max(sale.total - (sale.payment?.paid ?? 0), 0);

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
      <div className="stamp__note">
        {lunas
          ? kembalian > 0
            ? `${t.bayar.kembalian} ${rupiah(kembalian)}`
            : t.bayar.uangPas
          : `${t.utang.totalUtang} ${rupiah(kurang)}`}
      </div>
    </div>
  );
}
