import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { linesForSale } from '../../data/sales.js';
import { getCustomer } from '../../data/customers.js';
import { buildReceipt } from '../../printer/receipt.js';
import {
  canPrintBluetooth,
  connectPrinter,
  onPrinterChange,
  printerState,
  printLines,
} from '../../printer/bluetooth.js';
import { printViaBrowser, shareReceipt } from '../../printer/share.js';
import { t } from '../../strings/id.js';
import { useSettings } from '../settings-context.jsx';

/**
 * The struk, as paper, as a WhatsApp message, or as a browser print. Reached
 * from the stamp right after a sale and from any row in Laporan, so a reprint
 * costs the same as the first print.
 *
 * It is never on the path to completing a sale. A shopkeeper who does not want
 * a receipt taps nothing extra.
 */
export default function Struk({ sale, onClose }) {
  const { settings } = useSettings();
  const [printer, setPrinter] = useState(printerState);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null);
  const [error, setError] = useState(null);

  const lines = useLiveQuery(() => linesForSale(sale.id), [sale.id], null);
  const customer = useLiveQuery(
    () => (sale.customerId ? getCustomer(sale.customerId) : null),
    [sale.customerId],
    null,
  );

  useEffect(() => onPrinterChange(setPrinter), []);

  if (!lines) return null;

  const receipt = buildReceipt({
    sale,
    lines,
    shop: settings,
    profile: settings.profile,
    customer,
  });

  const jalankan = async (fn) => {
    setBusy(true);
    setError(null);
    setPesan(null);
    try {
      await fn();
    } catch (err) {
      setError(t.error[err.message] ?? t.error.printerGagal);
    }
    setBusy(false);
  };

  const cetak = () =>
    jalankan(async () => {
      await printLines(receipt, { drawer: settings.laciUang });
      navigator.vibrate?.(30);
      setPesan(t.struk.sudahDicetak);
    });

  const bagikan = () =>
    jalankan(async () => {
      const hasil = await shareReceipt(receipt, settings.namaUsaha || t.app);
      if (hasil.ok && hasil.cara === 'salin') setPesan(t.struk.tersalin);
      else if (!hasil.ok && !hasil.batal) setError(t.error.bagikanGagal);
    });

  return (
    <div className="sheet" role="dialog" aria-label={t.struk.judul}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{t.struk.judul}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.tutup}
          </button>
        </div>

        {/* What comes out of the printer, at the width it comes out at, so a
            wrong shop name is caught before the paper is spent. */}
        <div className="struk">
          {receipt.map((line, i) => (
            <div
              key={i}
              className={`struk__baris${line.big ? ' struk__baris--besar' : ''}${
                line.bold ? ' struk__baris--tebal' : ''
              }`}
            >
              {line.text || ' '}
            </div>
          ))}
        </div>

        {pesan && <span className="badge badge--ok">{pesan}</span>}
        {error && <span className="error">{error}</span>}

        {/* Bluetooth is absent, not disabled, on a phone that cannot do it.
            An iPhone will never grow the capability by being told about it. */}
        {canPrintBluetooth() ? (
          <>
            <button
              className="btn btn--primary btn--block btn--lg"
              disabled={busy}
              onClick={cetak}
            >
              {busy ? t.struk.mencetak : t.struk.cetak}
            </button>
            <p className="muted">
              {printer.connected
                ? t.struk.tersambung(printer.name ?? '')
                : t.struk.belumTersambung}
            </p>
          </>
        ) : (
          <p className="muted">{t.struk.takAdaBluetooth}</p>
        )}

        <button
          className={`btn btn--block btn--lg${canPrintBluetooth() ? '' : ' btn--primary'}`}
          disabled={busy}
          onClick={bagikan}
        >
          {t.struk.bagikan}
        </button>
        <span className="field__hint">{t.struk.bagikanPetunjuk}</span>

        <button
          className="btn btn--block"
          onClick={() => printViaBrowser(receipt, settings.namaUsaha || t.app)}
        >
          {t.struk.lewatBrowser}
        </button>
      </div>
    </div>
  );
}

/**
 * Pairing lives in Pengaturan, so the cashier does it once per session rather
 * than discovering a printer problem with a customer waiting.
 */
export function PrinterPengaturan() {
  const [printer, setPrinter] = useState(printerState);
  const [error, setError] = useState(null);

  useEffect(() => onPrinterChange(setPrinter), []);

  if (!canPrintBluetooth()) {
    return <p className="muted">{t.struk.takAdaBluetooth}</p>;
  }

  return (
    <>
      <p className="muted">
        {printer.connected ? t.struk.tersambung(printer.name ?? '') : t.struk.belumTersambung}
      </p>
      <button
        className="btn btn--block btn--lg"
        onClick={async () => {
          setError(null);
          try {
            // Straight from the gesture: Chrome refuses the chooser otherwise.
            await connectPrinter();
          } catch (err) {
            if (err?.name !== 'NotFoundError') {
              setError(t.error[err.message] ?? t.error.printerTakDikenali);
            }
          }
        }}
      >
        {t.struk.sambung}
      </button>
      {error && <span className="error">{error}</span>}
    </>
  );
}
