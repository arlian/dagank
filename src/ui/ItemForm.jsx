import { t, noun } from '../strings/id.js';
import { MODIFIER_SUGGESTIONS } from '../profiles/index.js';
import { useSettings } from './settings-context.jsx';
import MoneyInput from './MoneyInput.jsx';

/**
 * The item form is where the generalisation succeeds or fails. It is built
 * from settings.features, and when a flag is off the field is ABSENT, not
 * disabled and not hidden behind a toggle. A gorengan seller who sees a
 * barcode field has been shown the wrong app.
 */
export default function ItemForm({ value, onChange, errors = {}, categories = [] }) {
  const { settings } = useSettings();
  const { features, profile } = settings;
  const words = noun(profile);
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="stack">
      <div className="field">
        <label className="field__label" htmlFor="nama">
          {t.barang.nama}
        </label>
        <input
          id="nama"
          className="input"
          value={value.name}
          autoComplete="off"
          placeholder={t.barang.namaPetunjuk}
          onChange={(e) => set({ name: e.target.value })}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="harga">
          {t.barang.harga}
        </label>
        <MoneyInput id="harga" value={value.price} onChange={(price) => set({ price })} />
        {errors.price && <span className="error">{errors.price}</span>}
      </div>

      {features.modal && (
        <div className="field">
          <label className="field__label" htmlFor="modal">
            {t.barang.modal}
          </label>
          <MoneyInput
            id="modal"
            value={value.cost ?? 0}
            onChange={(cost) => set({ cost: cost || null })}
          />
          <span className="field__hint">{t.barang.modalPetunjuk}</span>
        </div>
      )}

      {categories.length > 0 && (
        <div className="field">
          <label className="field__label" htmlFor="kategori">
            {t.barang.kategori}
          </label>
          <select
            id="kategori"
            className="input"
            value={value.category ?? ''}
            onChange={(e) => set({ category: e.target.value || null })}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {features.barcode && (
        <div className="field">
          <label className="field__label" htmlFor="barcode">
            {t.barang.barcode}
          </label>
          <input
            id="barcode"
            className="input"
            inputMode="numeric"
            autoComplete="off"
            value={value.barcode ?? ''}
            onChange={(e) => set({ barcode: e.target.value || null })}
          />
        </div>
      )}

      {features.satuan && (
        <div className="field">
          <label className="field__label" htmlFor="satuan">
            {t.barang.satuan}
          </label>
          <input
            id="satuan"
            className="input"
            autoComplete="off"
            placeholder="pcs"
            value={value.unit ?? ''}
            onChange={(e) => set({ unit: e.target.value || null })}
          />
        </div>
      )}

      {features.modifier && (
        <div className="field">
          <span className="field__label">{t.barang.modifier}</span>
          <div className="chips" style={{ padding: 0, flexWrap: 'wrap' }}>
            {MODIFIER_SUGGESTIONS.map((mod) => {
              const on = value.modifiers?.some((m) => m.name === mod.name);
              return (
                <button
                  key={mod.name}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      modifiers: on
                        ? value.modifiers.filter((m) => m.name !== mod.name)
                        : [...(value.modifiers ?? []), mod],
                    })
                  }
                >
                  {mod.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* trackStock is read per item, never globally: a warung makan counts
          bottled drinks and never counts portions of nasi goreng. */}
      {features.stok && (
        <>
          <label className="switch">
            <span className="field__label">{t.barang.catatStok}</span>
            <input
              type="checkbox"
              checked={value.trackStock}
              onChange={(e) => set({ trackStock: e.target.checked })}
            />
          </label>

          {value.trackStock && (
            <div className="row">
              <div className="field spacer">
                <label className="field__label" htmlFor="stokAwal">
                  {t.barang.stokAwal}
                </label>
                <input
                  id="stokAwal"
                  className="input"
                  inputMode="numeric"
                  value={value.stokAwal ?? ''}
                  onChange={(e) =>
                    set({ stokAwal: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                />
              </div>
              <div className="field spacer">
                <label className="field__label" htmlFor="minStock">
                  {t.barang.stokMinimal}
                </label>
                <input
                  id="minStock"
                  className="input"
                  inputMode="numeric"
                  value={value.minStock ?? ''}
                  onChange={(e) =>
                    set({ minStock: Number(e.target.value.replace(/\D/g, '')) || null })
                  }
                />
              </div>
            </div>
          )}
        </>
      )}

      <span className="sr-only">{words.tambah}</span>
    </div>
  );
}

export const validateItem = (draft) => {
  const errors = {};
  if (!draft.name?.trim()) errors.name = t.error.namaKosong;
  if (!draft.price) errors.price = t.error.hargaKosong;
  return errors;
};
