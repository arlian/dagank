// One app, several business profiles. A profile is nothing but a preset of
// feature flags picked once at onboarding and editable afterwards.
//
// A preset is applied ONCE. After that the flags belong to the shop, and the
// profile name is kept only for display in settings. Never re-apply a preset
// on update, or a shopkeeper's deliberate choice gets overwritten.

export const PRESETS = {
  kelontong: {
    label: 'Toko kelontong / sembako',
    hint: 'Banyak barang, ada barcode, catat stok',
    features: {
      stok: true,
      barcode: true,
      satuan: true,
      modifier: false,
      utang: true,
      modal: true,
      shift: true,
      input: 'cari',
    },
    seedCategories: ['Sembako', 'Minuman', 'Snack', 'Rokok', 'Sabun & Deterjen'],
  },
  warungMakan: {
    label: 'Warung makan',
    hint: 'Menu tetap, ada tambahan seperti telur atau bungkus',
    features: {
      stok: true,
      barcode: false,
      satuan: false,
      modifier: true,
      utang: true,
      modal: false,
      shift: true,
      input: 'grid',
    },
    seedCategories: ['Makanan', 'Minuman', 'Tambahan'],
  },
  kakiLima: {
    label: 'Gerobak / kaki lima',
    hint: 'Sedikit jenis, harga tetap, yang penting cepat',
    features: {
      stok: false,
      barcode: false,
      satuan: false,
      modifier: false,
      utang: false,
      modal: true,
      shift: false,
      input: 'grid',
    },
    seedCategories: [],
  },
  jasa: {
    label: 'Jasa',
    hint: 'Tidak ada barang, hanya layanan',
    features: {
      stok: false,
      barcode: false,
      satuan: false,
      modifier: false,
      utang: true,
      modal: false,
      shift: false,
      input: 'grid',
    },
    seedCategories: [],
  },
};

export const PROFILE_KEYS = Object.keys(PRESETS);

/** The safe floor for a shop whose settings predate a newly added flag. */
export const DEFAULT_FEATURES = {
  stok: false,
  barcode: false,
  satuan: false,
  modifier: false,
  utang: false,
  modal: false,
  shift: false,
  input: 'grid',
};

export const featuresFor = (profile) => ({
  ...DEFAULT_FEATURES,
  ...(PRESETS[profile]?.features ?? {}),
});

/**
 * Merge stored flags over the defaults, so a shop that upgrades into a build
 * with a new flag gets the flag off rather than undefined.
 */
export const normaliseFeatures = (stored) => ({ ...DEFAULT_FEATURES, ...(stored ?? {}) });

/** Modifier sets worth offering a warung makan. Never applied silently. */
export const MODIFIER_SUGGESTIONS = [
  { name: 'Telur', price: 5000 },
  { name: 'Pedas', price: 0 },
  { name: 'Bungkus', price: 1000 },
  { name: 'Tanpa nasi', price: -3000 },
  { name: 'Es', price: 0 },
  { name: 'Panas', price: 0 },
];

/**
 * Sample items for "Coba dulu dengan contoh", so the app can be explored
 * without typing. Seeded items are marked and removable in one action.
 */
export const SAMPLE_ITEMS = {
  kelontong: [
    { name: 'Beras 1 kg', price: 13000, cost: 11500, category: 'Sembako', trackStock: true },
    { name: 'Minyak goreng 1 L', price: 18000, cost: 16000, category: 'Sembako', trackStock: true },
    { name: 'Gula pasir 1 kg', price: 15000, cost: 13500, category: 'Sembako', trackStock: true },
    { name: 'Teh kotak', price: 4000, cost: 3200, category: 'Minuman', trackStock: true },
    { name: 'Mie instan', price: 3500, cost: 2900, category: 'Sembako', trackStock: true },
  ],
  // The sample menu carries modifiers, because they are the whole point of
  // this profile and a demo that hides them undersells the app.
  warungMakan: [
    {
      name: 'Nasi goreng',
      price: 15000,
      category: 'Makanan',
      trackStock: false,
      modifiers: [
        { name: 'Telur', price: 5000 },
        { name: 'Pedas', price: 0 },
        { name: 'Bungkus', price: 1000 },
      ],
    },
    {
      name: 'Mie goreng',
      price: 15000,
      category: 'Makanan',
      trackStock: false,
      modifiers: [
        { name: 'Telur', price: 5000 },
        { name: 'Pedas', price: 0 },
        { name: 'Bungkus', price: 1000 },
      ],
    },
    {
      name: 'Ayam geprek',
      price: 18000,
      category: 'Makanan',
      trackStock: false,
      modifiers: [
        { name: 'Pedas', price: 0 },
        { name: 'Bungkus', price: 1000 },
      ],
    },
    {
      name: 'Es teh',
      price: 5000,
      category: 'Minuman',
      trackStock: false,
      modifiers: [
        { name: 'Es', price: 0 },
        { name: 'Panas', price: 0 },
      ],
    },
    { name: 'Air mineral', price: 4000, category: 'Minuman', trackStock: true },
  ],
  kakiLima: [
    { name: 'Gorengan', price: 1000, cost: 600 },
    { name: 'Cilok', price: 2000, cost: 1100 },
    { name: 'Es teh', price: 3000, cost: 1500 },
    { name: 'Es jeruk', price: 5000, cost: 2500 },
  ],
  jasa: [
    { name: 'Cuci kiloan', price: 8000 },
    { name: 'Setrika saja', price: 5000 },
    { name: 'Cuci sepatu', price: 25000 },
  ],
};
