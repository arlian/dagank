import { useEffect, useRef, useState } from 'react';
import { t } from '../../strings/id.js';
import { rupiah } from '../../domain/money.js';
import { IconCek } from '../components/icons.jsx';

/**
 * Getting a barcode into the till, by camera where the browser can, by typing
 * everywhere else. Typing also covers USB scanners, which behave as keyboards
 * and send the code followed by Enter.
 *
 * Two decoders, chosen at runtime. The browser's own BarcodeDetector is
 * preferred: native, instant, and free. It is Chromium-only though, so
 * everywhere else a JS decoder is fetched on demand. That download is a few
 * hundred KB, which is real money on a prepaid connection, so the phones that
 * do not need it never see it.
 */

// The formats that actually appear on Indonesian retail packaging. Asking for
// fewer formats makes each detection pass cheaper.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

/**
 * Why camera scanning is or is not available. Returning the specific reason
 * matters: "kamera tidak jalan" sends someone hunting through phone settings
 * when the real problem is that the page is on http.
 */
export function alasanScan() {
  if (typeof window === 'undefined') return 'takAdaKamera';
  // The camera is gated on a secure context no matter which decoder runs.
  // localhost counts; a LAN address over http does not, which is the usual
  // reason this fails during testing.
  if (!window.isSecureContext) return 'takAman';
  if (!navigator.mediaDevices?.getUserMedia) return 'takAdaKamera';
  // Native decoding where it exists: Chrome on Android, ChromeOS, macOS.
  if ('BarcodeDetector' in window) return 'ok';
  // Everywhere else the camera is fine and only the decoder is missing, so
  // fetch one. Desktop Chrome on Windows and Linux, and every iOS browser,
  // land here.
  return 'perluUnduh';
}

/**
 * `onDetect(code)` decides what a scanned code means, and owns its own wording:
 *   { ok: true,  nama?, harga?, qty? }  accepted
 *   { ok: false, pesan }                rejected, with the reason to show
 *
 * Two callers need different things from the same camera. The till looks the
 * code up and adds an item; the item form just captures the digits and has to
 * refuse a code another item already uses.
 *
 * `sekali` closes after the first accepted code, for callers that want one
 * code rather than a stream of them.
 */
export default function ScanBarcode({ onDetect, onClose, sekali = false }) {
  const [reason] = useState(alasanScan);
  const [manual, setManual] = useState(false);

  if (manual || (reason !== 'ok' && reason !== 'perluUnduh')) {
    return (
      <KetikBarcode reason={manual ? null : reason} onDetect={onDetect} onClose={onClose} />
    );
  }
  return (
    <Kamera
      mode={reason === 'ok' ? 'native' : 'zxing'}
      onDetect={onDetect}
      onClose={onClose}
      sekali={sekali}
      onManual={() => setManual(true)}
    />
  );
}

function Kamera({ mode, onDetect, onClose, sekali, onManual }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastRef = useRef({ code: null, at: 0 });

  // Held in a ref so the camera does not restart every time the parent
  // re-renders. The parent rebuilds this callback on each render, and with it
  // in the dependency list the stream was torn down and reopened constantly,
  // which never left it running long enough to decode anything.
  const detectRef = useRef(onDetect);
  detectRef.current = onDetect;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const [status, setStatus] = useState('minta');
  const [added, setAdded] = useState(null);
  const [rejected, setRejected] = useState(null);
  const [torch, setTorch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    let controls;

    const run = async () => {
      let detector;
      if (mode === 'native') {
        try {
          const available = await window.BarcodeDetector.getSupportedFormats();
          const formats = FORMATS.filter((f) => available.includes(f));
          detector = new window.BarcodeDetector(
            formats.length ? { formats } : undefined,
          );
          console.log('[scan] decoder bawaan browser, format:', formats);
        } catch (err) {
          console.error('[scan] gagal menyiapkan decoder bawaan:', err);
          if (!cancelled) setStatus('gagal');
          return;
        }
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (err) {
        console.error('[scan] kamera tidak bisa dibuka:', err?.name, err?.message);
        if (cancelled) return;
        setStatus(err?.name === 'NotAllowedError' ? 'ditolak' : 'gagal');
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      console.log('[scan] kamera jalan:', track?.getSettings?.());
      if (track?.getCapabilities?.().torch) setTorch(false);
      if (!cancelled) setStatus('jalan');

      const handle = async (code, format) => {
        const now = Date.now();
        // One physical scan fills many frames with the same code. Ignoring
        // repeats for a moment stops it adding the item several times.
        if (lastRef.current.code === code && now - lastRef.current.at < 1800) {
          console.debug('[scan] dobel, diabaikan:', code);
          return;
        }
        lastRef.current = { code, at: now };

        console.log('[scan] terbaca:', code, { format, decoder: mode });

        navigator.vibrate?.(40);
        const hasil = await detectRef.current(code);
        console.log(hasil?.ok ? '[scan] diterima:' : '[scan] ditolak:', code, hasil?.pesan ?? '');
        if (cancelled) return;

        if (!hasil?.ok) {
          setAdded(null);
          setRejected(hasil?.pesan ?? code);
          return;
        }

        setRejected(null);
        if (sekali) {
          closeRef.current();
          return;
        }
        setAdded(hasil);
      };

      if (mode === 'native') {
        const tick = async () => {
          if (cancelled) return;
          if (videoRef.current?.videoWidth) {
            try {
              const [found] = await detector.detect(videoRef.current);
              if (found?.rawValue) await handle(found.rawValue, found.format);
            } catch {
              // A dropped frame is normal; keep scanning.
            }
          }
          if (!cancelled) timer = setTimeout(tick, 180);
        };
        timer = setTimeout(tick, 180);
        return;
      }

      // Fallback decoder, fetched only on browsers that need it. It reads the
      // stream this component already owns, so the torch control still works.
      try {
        console.log('[scan] browser tanpa BarcodeDetector, memuat decoder cadangan...');
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
          await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
        if (cancelled) return;

        // Without this the reader tries every format it knows on every frame,
        // including 2D ones no shelf product carries. MaxiCode in particular
        // throws a ChecksumException per frame, which floods the console and
        // wastes most of the decoding budget. Retail barcodes are all 1D.
        const hints = new Map([
          [
            DecodeHintType.POSSIBLE_FORMATS,
            [
              BarcodeFormat.EAN_13,
              BarcodeFormat.EAN_8,
              BarcodeFormat.UPC_A,
              BarcodeFormat.UPC_E,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
              BarcodeFormat.ITF,
            ],
          ],
        ]);

        const reader = new BrowserMultiFormatReader(hints);
        console.log('[scan] decoder cadangan siap (1D saja)');
        controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
          // The callback also fires with a NotFoundException on every frame
          // that holds no barcode, which is most of them. Only results matter.
          if (result?.getText) {
            handle(result.getText(), BarcodeFormat[result.getBarcodeFormat?.()]);
          }
        });
        if (cancelled) controls.stop();
      } catch (err) {
        console.error('[scan] decoder cadangan gagal:', err);
        if (!cancelled) setStatus('gagal');
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controls?.stop();
      // A camera left running keeps the phone's indicator lit and drains a
      // battery that has to last a whole trading day.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [mode, sekali]);

  // The confirmation clears itself. Scanning a queue of items should never
  // need a tap to acknowledge each one.
  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(null), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorch(next);
    } catch {
      setTorch(null);
    }
  };

  return (
    <div className="sheet" role="dialog" aria-label={t.kasir.scan}>
      <div className="pindai">
        <video ref={videoRef} className="pindai__video" muted playsInline />

        {status === 'jalan' && (
          <>
            <div className="pindai__bingkai" aria-hidden="true" />
            <p className="pindai__petunjuk">{t.kasir.arahkan}</p>
          </>
        )}

        {status === 'minta' && <p className="pindai__pesan">{t.kasir.mintaKamera}</p>}
        {status === 'ditolak' && <p className="pindai__pesan">{t.error.kameraDitolak}</p>}
        {status === 'gagal' && <p className="pindai__pesan">{t.error.kameraGagal}</p>}

        {added && (
          <div className="masuk" role="status">
            <IconCek className="masuk__cek" />
            <div className="masuk__isi">
              <div className="masuk__nama">{added.nama}</div>
              <div className="masuk__sub">
                {t.kasir.ditambahkan} · {rupiah(added.harga)}
              </div>
            </div>
            {added.qty > 1 && <span className="masuk__qty">{added.qty}</span>}
          </div>
        )}

        {rejected && <p className="pindai__pesan pindai__pesan--gagal">{rejected}</p>}

        <div className="pindai__aksi">
          {torch !== null && (
            <button className="btn" onClick={toggleTorch} aria-pressed={torch}>
              {torch ? t.kasir.senterMati : t.kasir.senterNyala}
            </button>
          )}
          <button className="btn" onClick={onManual}>
            {t.kasir.ketikBarcode}
          </button>
          <button className="btn btn--block" onClick={onClose}>
            {t.aksi.tutup}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Typing the code: the fallback, and the path USB scanners already use. */
function KetikBarcode({ reason, onDetect, onClose }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (value) => {
    const code = value.trim();
    if (!code) return;
    const hasil = await onDetect(code);
    if (hasil?.ok) onClose();
    else setError(hasil?.pesan ?? code);
  };

  return (
    <div className="sheet" role="dialog" aria-label={t.kasir.ketikBarcode}>
      <div className="sheet__panel">
        <div className="row row--between">
          <h2>{t.kasir.ketikBarcode}</h2>
          <button className="btn" onClick={onClose}>
            {t.aksi.tutup}
          </button>
        </div>

        {/* Say which obstacle this is. "Kamera tidak jalan" sends someone
            hunting through phone settings when the page is simply on http. */}
        {reason && <p className="muted">{t.error[reason]}</p>}

        <input
          ref={inputRef}
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t.kasir.scan}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(e.currentTarget.value);
          }}
        />
        {error && <span className="error">{error}</span>}

        <button
          className="btn btn--primary btn--block btn--lg"
          onClick={() => submit(inputRef.current?.value ?? '')}
        >
          {t.aksi.tambah}
        </button>
      </div>
    </div>
  );
}
