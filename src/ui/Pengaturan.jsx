import { useEffect, useRef, useState } from 'react';
import { saveSettings, setFeature } from '../data/settings.js';
import {
  exportBackup,
  exportItemsCsv,
  exportSalesCsv,
  importBackup,
  lastExportAt,
} from '../data/backup.js';
import { removeSampleItems } from '../data/items.js';
import { PRESETS } from '../profiles/index.js';
import { t, tanggal } from '../strings/id.js';
import { useSettings } from './settings-context.jsx';

const FLAGS = ['stok', 'barcode', 'satuan', 'modifier', 'utang', 'modal', 'shift'];

export default function Pengaturan() {
  const { settings, refresh } = useSettings();
  const [nama, setNama] = useState(settings.namaUsaha);
  const [lastExport, setLastExport] = useState(undefined);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    lastExportAt().then(setLastExport);
  }, []);

  const toggle = async (flag, value) => {
    await setFeature(flag, value);
    await refresh();
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm(t.pengaturan.pulihkanPeringatan)) return;
    try {
      await importBackup(await file.text());
      await refresh();
      setMessage(t.aksi.selesai);
      setError(null);
    } catch (err) {
      setError(t.error[err.message] ?? t.error.fileSalah);
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <h1>{t.pengaturan.judul}</h1>
      </div>

      <div className="body">
        <div className="card stack">
          <div className="field">
            <label className="field__label" htmlFor="namaUsaha">
              {t.pengaturan.namaUsaha}
            </label>
            <input
              id="namaUsaha"
              className="input"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              onBlur={async () => {
                await saveSettings({ namaUsaha: nama.trim() });
                await refresh();
              }}
            />
          </div>
          <div className="stat">
            <span>{t.pengaturan.jenisUsaha}</span>
            <span className="muted">{PRESETS[settings.profile]?.label ?? '—'}</span>
          </div>
        </div>

        <div className="card">
          <h2>{t.pengaturan.fitur}</h2>
          <p className="muted">{t.pengaturan.fiturPetunjuk}</p>
          {FLAGS.map((flag) => (
            <label key={flag} className="switch">
              <span>{t.fitur[flag]}</span>
              <input
                type="checkbox"
                checked={settings.features[flag]}
                onChange={(e) => toggle(flag, e.target.checked)}
              />
            </label>
          ))}

          <div className="field" style={{ marginTop: 12 }}>
            <span className="field__label">{t.fitur.input}</span>
            <div className="row">
              <button
                className={`btn spacer ${settings.features.input === 'grid' ? 'btn--primary' : ''}`}
                onClick={() => toggle('input', 'grid')}
              >
                {t.fitur.inputGrid}
              </button>
              <button
                className={`btn spacer ${settings.features.input === 'cari' ? 'btn--primary' : ''}`}
                onClick={() => toggle('input', 'cari')}
              >
                {t.fitur.inputCari}
              </button>
            </div>
          </div>
        </div>

        {/* Backup is the whole support story for an app with no server. */}
        <div className="card stack">
          <h2>{t.pengaturan.cadangan}</h2>
          <p className="muted">
            {lastExport
              ? t.pengaturan.terakhirCadang(tanggal(lastExport))
              : t.pengaturan.belumPernahCadang}
          </p>
          <button
            className="btn btn--primary btn--block btn--lg"
            onClick={async () => {
              await exportBackup();
              setLastExport(Date.now());
            }}
          >
            {t.pengaturan.cadangkan}
          </button>
          <div className="row">
            <button className="btn spacer" onClick={exportItemsCsv}>
              CSV barang
            </button>
            <button className="btn spacer" onClick={exportSalesCsv}>
              CSV penjualan
            </button>
          </div>
          <button className="btn btn--block" onClick={() => fileRef.current?.click()}>
            {t.pengaturan.pulihkan}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={onImport}
          />
          <p className="muted">{t.pengaturan.pulihkanPeringatan}</p>
          {message && <span className="badge badge--ok">{message}</span>}
          {error && <span className="error">{error}</span>}
        </div>

        <div className="card stack">
          <button
            className="btn btn--danger btn--block"
            onClick={async () => {
              const n = await removeSampleItems();
              setMessage(`${n} ${t.barang.contoh}`);
            }}
          >
            {t.barang.hapusContoh}
          </button>
          <p className="muted">
            {t.pengaturan.versi} {__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
