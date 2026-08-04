import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  allStock,
  createItem,
  deleteItem,
  emptyItem,
  listItems,
  updateItem,
} from '../data/items.js';
import { listCategories } from '../data/settings.js';
import { stockWarning } from '../domain/stock.js';
import { rupiah } from '../domain/money.js';
import { t, noun } from '../strings/id.js';
import { useSettings } from './settings-context.jsx';
import ItemForm, { validateItem } from './ItemForm.jsx';

export default function Barang() {
  const { settings } = useSettings();
  const words = noun(settings.profile);

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyItem);
  const [errors, setErrors] = useState({});

  const items = useLiveQuery(listItems, [], []);
  const stock = useLiveQuery(allStock, [], new Map());
  const categories = useLiveQuery(listCategories, [], []);

  const open = (item) => {
    setEditing(item ?? 'baru');
    setDraft(item ? { ...item } : emptyItem());
    setErrors({});
  };

  const save = async () => {
    const found = validateItem(draft);
    setErrors(found);
    if (Object.keys(found).length) return;

    const { stokAwal, ...rest } = draft;
    if (editing === 'baru') await createItem({ ...rest, name: rest.name.trim() }, { stokAwal });
    else await updateItem(editing.id, { ...rest, name: rest.name.trim() });
    setEditing(null);
  };

  const remove = async () => {
    // Confirmed because it is destructive; a normal save never is.
    if (!window.confirm(`${t.aksi.hapus} ${editing.name}?`)) return;
    await deleteItem(editing.id);
    setEditing(null);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <h1>{capitalise(words.satu)}</h1>
        <button className="btn btn--primary" onClick={() => open(null)}>
          + {t.aksi.tambah}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <p>
            {t.barang.kosong}
            <br />
            {t.barang.kosongPetunjuk}
          </p>
          <button className="btn btn--primary btn--lg" onClick={() => open(null)}>
            {words.tambah}
          </button>
        </div>
      ) : (
        <div className="body">
          <div className="list">
            {items.map((item) => {
              const count = stock.get(item.id) ?? 0;
              const warn = stockWarning(item, count);
              return (
                <button key={item.id} className="list__item" onClick={() => open(item)}>
                  <span className="line__main">
                    <span className="strong">{item.name}</span>
                    {item.sample && <span className="badge"> {t.barang.contoh}</span>}
                    <br />
                    <span className="muted">
                      {rupiah(item.price)}
                      {item.trackStock && ` · ${t.barang.stok} ${count}`}
                    </span>
                  </span>
                  {warn && (
                    <span
                      className={`badge badge--${warn === 'habis' ? 'danger' : 'warn'}`}
                    >
                      {warn === 'habis' ? t.barang.habis : t.barang.menipis}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <div className="sheet" role="dialog" aria-label={words.tambah}>
          <div className="sheet__panel">
            <div className="row row--between">
              <h2>{editing === 'baru' ? words.tambah : t.aksi.ubah}</h2>
              <button className="btn" onClick={() => setEditing(null)}>
                {t.aksi.batal}
              </button>
            </div>

            <ItemForm
              value={draft}
              onChange={setDraft}
              errors={errors}
              categories={categories}
            />

            <button className="btn btn--primary btn--block btn--lg" onClick={save}>
              {t.aksi.simpan}
            </button>
            {editing !== 'baru' && (
              <button className="btn btn--danger btn--block" onClick={remove}>
                {t.aksi.hapus}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
