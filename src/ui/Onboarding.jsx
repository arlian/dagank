import { useState } from 'react';
import { PRESETS, SAMPLE_ITEMS, featuresFor } from '../profiles/index.js';
import { applyPreset } from '../data/settings.js';
import { createItem, emptyItem } from '../data/items.js';
import { t } from '../strings/id.js';
import { SettingsProvider } from './settings-context.jsx';
import ItemForm, { validateItem } from './ItemForm.jsx';

/**
 * Three screens. No printer setup, no tax, no cash float, no logo: each of
 * those is a place to abandon. Getting a shopkeeper to their first successful
 * sale in under a minute is the whole retention battle.
 */
export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [nama, setNama] = useState('');
  const [draft, setDraft] = useState(emptyItem);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const finish = async (items) => {
    setBusy(true);
    await applyPreset(profile, nama);
    for (const item of items) {
      const { stokAwal, ...rest } = item;
      await createItem(rest, { stokAwal });
    }
    await onDone();
  };

  const submitItem = async () => {
    const found = validateItem(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    await finish([{ ...draft, name: draft.name.trim() }]);
  };

  const useSamples = () =>
    finish(
      (SAMPLE_ITEMS[profile] ?? []).map((item) => ({
        ...emptyItem(),
        ...item,
        sample: true,
        stokAwal: item.trackStock ? 12 : 0,
      })),
    );

  if (step === 1) {
    return (
      <div className="screen screen--flush">
        <div className="topbar">
          <h1>{t.onboarding.jenisJudul}</h1>
        </div>
        <div className="body">
          <p className="muted">{t.onboarding.jenisPetunjuk}</p>
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className="card list__item"
              style={{ minHeight: 76 }}
              onClick={() => {
                setProfile(key);
                setStep(2);
              }}
            >
              <span>
                <span className="strong">{preset.label}</span>
                <br />
                <span className="muted">{preset.hint}</span>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="screen screen--flush">
        <div className="topbar">
          <h1>{t.onboarding.namaJudul}</h1>
        </div>
        <div className="body">
          <div className="field">
            <label className="field__label" htmlFor="namaUsaha">
              {t.pengaturan.namaUsaha}
            </label>
            <input
              id="namaUsaha"
              className="input"
              autoFocus
              value={nama}
              placeholder={t.onboarding.namaContoh}
              onChange={(e) => setNama(e.target.value)}
            />
            <span className="field__hint">{t.onboarding.namaPetunjuk}</span>
            {errors.nama && <span className="error">{errors.nama}</span>}
          </div>
          <div className="spacer" />
          <button
            className="btn btn--primary btn--block btn--lg"
            onClick={() => {
              if (!nama.trim()) return setErrors({ nama: t.error.namaUsahaKosong });
              setErrors({});
              setStep(3);
            }}
          >
            {t.aksi.lanjut}
          </button>
        </div>
      </div>
    );
  }

  // The chosen preset is not saved until the end, so step 3 previews it
  // through a local provider rather than committing early.
  const pending = {
    namaUsaha: nama,
    profile,
    features: featuresFor(profile),
    rounding: 'none',
    onboarded: false,
  };

  return (
    <SettingsProvider value={{ settings: pending, refresh: async () => {} }}>
      <div className="screen screen--flush">
        <div className="topbar">
          <h1>{t.onboarding.itemJudul}</h1>
        </div>
        <div className="body">
          <p className="muted">{t.onboarding.itemPetunjuk}</p>
          <ItemForm
            value={draft}
            onChange={setDraft}
            errors={errors}
            categories={PRESETS[profile]?.seedCategories ?? []}
          />
          <div className="spacer" />
          <button
            className="btn btn--primary btn--block btn--lg"
            disabled={busy}
            onClick={submitItem}
          >
            {t.onboarding.mulai}
          </button>
          {(SAMPLE_ITEMS[profile]?.length ?? 0) > 0 && (
            <button className="btn btn--block" disabled={busy} onClick={useSamples}>
              {t.aksi.coba}
            </button>
          )}
        </div>
      </div>
    </SettingsProvider>
  );
}
