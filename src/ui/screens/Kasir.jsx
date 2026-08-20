import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listItems, findByBarcode, frequentItems, allStock } from '../../data/items.js';
import { lineFromItem, salesOn } from '../../data/sales.js';
import { addLine, calcSale, setLineQty } from '../../domain/sale.js';
import { stockAfterCart, stockWarning } from '../../domain/stock.js';
import { rupiah } from '../../domain/money.js';
import { t, noun } from '../../strings/id.js';
import { useSettings } from '../settings-context.jsx';
import Bayar from './Bayar.jsx';
import Stamp from '../components/Stamp.jsx';
import { IconScan } from '../components/icons.jsx';
import ScanBarcode from './ScanBarcode.jsx';
import Struk from './Struk.jsx';

export default function Kasir() {
  const { settings } = useSettings();
  const { features, profile } = settings;
  const words = noun(profile);

  const [lines, setLines] = useState([]);
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [paying, setPaying] = useState(false);
  const [stamped, setStamped] = useState(null);
  const [struk, setStruk] = useState(null);

  const items = useLiveQuery(listItems, [], []);
  const stock = useLiveQuery(allStock, [], new Map());
  const frequent = useLiveQuery(frequentItems, [], []);
  const todaySales = useLiveQuery(() => salesOn(), [], []);

  const todayTotal = todaySales
    .filter((s) => s.status === 'selesai')
    .reduce((sum, s) => sum + s.total, 0);

  const totals = calcSale({ lines, rounding: settings.rounding });

  // Warnings read from what is left AFTER the running cart, so adding five of
  // an item with three in stock says so immediately rather than staying quiet
  // until the next sale.
  const sisa = stockAfterCart(stock, lines);

  const add = (item, extra = {}) => {
    setLines((current) => addLine(current, lineFromItem(item, extra)));
    navigator.vibrate?.(20);
  };

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter(Boolean))],
    [items],
  );

  /**
   * Returns what was added so the scanner can confirm it by name. A bare
   * `true` is not enough: the cashier needs to see WHICH item landed, and how
   * many of it are now on the sale, without leaving the camera.
   */
  const onScan = async (code) => {
    const item = await findByBarcode(code.trim());
    if (!item) return { ok: false, pesan: t.error.barcodeTidakAda(code) };

    // Read the count from the current lines and add one: this runs before the
    // state update lands, so the stored value is still the previous total.
    const sebelum = lines
      .filter((l) => l.itemId === item.id)
      .reduce((sum, l) => sum + l.qty, 0);

    add(item);
    navigator.vibrate?.(30);
    return { ok: true, nama: item.name, harga: item.price, qty: sebelum + 1 };
  };

  return (
    <div className="screen">
      <div className="topbar">
        <div>
          <strong>{settings.namaUsaha || t.app}</strong>
          <div className="topbar__sub">
            {t.kasir.hariIni}: {rupiah(todayTotal)}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <p>
            {t.barang.kosong} {t.barang.kosongPetunjuk}
          </p>
          <a className="btn btn--primary" href="#/barang">
            {words.tambah}
          </a>
        </div>
      ) : features.input === 'cari' ? (
        <CariMode
          items={items}
          stock={sisa}
          frequent={frequent}
          query={query}
          setQuery={setQuery}
          onPick={add}
          onScan={onScan}
          words={words}
        />
      ) : (
        <GridMode
          items={items}
          stock={sisa}
          lines={lines}
          categories={categories}
          category={category}
          setCategory={setCategory}
          onPick={add}
        />
      )}

      <div className="spacer" />

      {lines.length > 0 && (
        <div className="lines">
          {lines.map((line, index) => (
            <Line
              key={`${line.itemId}-${index}`}
              line={line}
              item={items.find((i) => i.id === line.itemId)}
              sisa={sisa.get(line.itemId) ?? 0}
              showModifiers={features.modifier}
              onQty={(qty) => setLines((c) => setLineQty(c, index, qty))}
              onModifiers={(modifiers) =>
                setLines((c) =>
                  c.map((l, i) => (i === index ? { ...l, modifiers } : l)),
                )
              }
            />
          ))}
        </div>
      )}

      <div className="paybar">
        {lines.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
            {t.kasir.kosongPetunjuk}
          </p>
        ) : (
          <button
            className="btn btn--primary btn--block btn--pay"
            onClick={() => setPaying(true)}
          >
            {t.kasir.bayar(rupiah(totals.total))}
          </button>
        )}
      </div>

      {paying && (
        <Bayar
          lines={lines}
          onClose={() => setPaying(false)}
          onDone={(sale) => {
            setLines([]);
            setPaying(false);
            setQuery('');
            setStamped(sale);
            navigator.vibrate?.(30);
          }}
        />
      )}

      {stamped && (
        <Stamp
          sale={stamped}
          onDone={() => setStamped(null)}
          onStruk={() => {
            setStruk(stamped);
            setStamped(null);
          }}
        />
      )}

      {struk && <Struk sale={struk} onClose={() => setStruk(null)} />}
    </div>
  );
}

/**
 * Stock never blocks a sale, so this is the whole safety net: it has to say
 * which of the three situations the cashier is in, and by how much. Colour is
 * never the only signal, so each state carries its word.
 */
function StokBadge({ warn, left }) {
  if (!warn) return null;

  const label = {
    kurang: `${t.barang.kurang} ${-left}`,
    habis: t.barang.habis,
    menipis: `${t.barang.menipis} · ${t.barang.sisaStok(left)}`,
  }[warn];

  return (
    <span className={`badge badge--${warn === 'menipis' ? 'warn' : 'danger'}`}>
      {label}
    </span>
  );
}

/** Grid: the item board IS the interface. One tap adds, a second tap increments. */
function GridMode({ items, stock, lines, categories, category, setCategory, onPick }) {
  const visible = category ? items.filter((i) => i.category === category) : items;
  const qtyOf = (id) =>
    lines.filter((l) => l.itemId === id).reduce((sum, l) => sum + l.qty, 0);

  return (
    <>
      {/* Category chips appear only once the items outgrow one screen. */}
      {categories.length > 1 && items.length > 12 && (
        <div className="chips">
          <button
            className="chip"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            {t.kasir.semuaKategori}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className="chip"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="grid">
        {visible.map((item) => {
          const qty = qtyOf(item.id);
          const warn = stockWarning(item, stock.get(item.id) ?? 0);
          const left = stock.get(item.id) ?? 0;
          return (
            <button
              key={item.id}
              className="tile"
              style={item.gridColor ? { background: item.gridColor } : undefined}
              onClick={() => onPick(item)}
            >
              <span className="tile__name">{item.name}</span>
              <span className="tile__price">{rupiah(item.price)}</span>
              <StokBadge warn={warn} left={left} />
              {qty > 0 && <span className="tile__badge">{qty}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Search: hundreds of items make a grid useless. Scan is the faster path. */
function CariMode({ items, stock, frequent, query, setQuery, onPick, onScan, words }) {
  const [scanning, setScanning] = useState(false);

  const q = query.trim().toLowerCase();
  const results =
    q.length < 2
      ? []
      : items.filter(
          (i) => i.name.toLowerCase().includes(q) || (i.barcode ?? '').includes(q),
        );

  return (
    <div className="stack" style={{ padding: 16 }}>
      <button
        className="btn btn--primary btn--block btn--lg"
        onClick={() => setScanning(true)}
      >
        <IconScan width="22" height="22" /> {t.kasir.scan}
      </button>

      {scanning && (
        <ScanBarcode onDetect={onScan} onClose={() => setScanning(false)} />
      )}

      {frequent.length > 0 && q.length < 2 && (
        <div className="field">
          <span className="field__label">{t.kasir.sering}</span>
          <div className="chips" style={{ padding: 0 }}>
            {frequent.map((item) => (
              <button key={item.id} className="chip" onClick={() => onPick(item)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        className="input"
        placeholder={words.cari}
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {results.length > 0 && (
        <div className="list">
          {results.slice(0, 12).map((item) => {
            const warn = stockWarning(item, stock.get(item.id) ?? 0);
          const left = stock.get(item.id) ?? 0;
            return (
              <button key={item.id} className="list__item" onClick={() => onPick(item)}>
                <span>
                  {item.name}
                  {warn && (
                    <>
                      {' '}
                      <StokBadge warn={warn} left={left} />
                    </>
                  )}
                </span>
                <span className="strong">{rupiah(item.price)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Line({ line, item, sisa, showModifiers, onQty, onModifiers }) {
  const available = item?.modifiers ?? [];
  const warn = stockWarning(item, sisa);
  const subtotal =
    (line.price + (line.modifiers ?? []).reduce((s, m) => s + (m.price || 0), 0)) *
    line.qty;

  return (
    <div className="line">
      <div className="line__main">
        <div className="line__name">{line.name}</div>
        <div className="line__sub">
          {rupiah(Math.round(subtotal))}{' '}
          {/* Said here, on the line the cashier just touched, rather than only
              on the tile they have already looked away from. */}
          <StokBadge warn={warn} left={sisa} />
        </div>

        {/* Modifiers are chips on the line after adding, never a blocking
            dialog before it. */}
        {showModifiers && available.length > 0 && (
          <div className="chips" style={{ padding: '6px 0 0', flexWrap: 'wrap' }}>
            {available.map((mod) => {
              const on = line.modifiers?.some((m) => m.name === mod.name);
              return (
                <button
                  key={mod.name}
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    onModifiers(
                      on
                        ? line.modifiers.filter((m) => m.name !== mod.name)
                        : [...(line.modifiers ?? []), mod],
                    )
                  }
                >
                  {mod.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="stepper">
        <button
          className="stepper__btn"
          aria-label={t.aksi.hapus}
          onClick={() => onQty(line.qty - 1)}
        >
          −
        </button>
        <span className="stepper__qty">{line.qty}</span>
        <button
          className="stepper__btn"
          aria-label={t.aksi.tambah}
          onClick={() => onQty(line.qty + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
