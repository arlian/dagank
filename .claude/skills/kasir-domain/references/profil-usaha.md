# Profil usaha: presets and what actually differs

Read this when working on onboarding, the settings screen, feature flags, or any behaviour that changes per business type.

Contents:
1. Presets table
2. Preset definitions in code
3. Profile notes, one section each
4. Onboarding flow
5. Adding a new profile

---

## 1. Presets table

| | kelontong | warung makan | kaki lima | jasa |
|---|---|---|---|---|
| Typical seller | toko sembako | warteg, nasi goreng | gorengan, es teh, cilok | pulsa, laundry, potong rambut |
| Item count | 100 to 800 | 20 to 40 | 4 to 15 | 3 to 10 |
| `stok` | on | on | off | off |
| `barcode` | on | off | off | off |
| `satuan` | on | off | off | off |
| `modifier` | off | on | off | off |
| `utang` | on | on | off | on |
| `modal` | on | off | on | off |
| `input` | cari | grid | grid | grid |
| Printer | common | sometimes | rare | sometimes |
| Transactions/day | 50 to 200 | 40 to 150 | 100 to 400 | 5 to 30 |
| Avg value | 5k to 50k | 10k to 30k | 1k to 10k | 10k to 100k |

The two rows that change the feel of the app most are `input` and `modifier`. The rest are mostly about how crowded the item form looks.

---

## 2. Preset definitions

```js
export const PRESETS = {
  kelontong: {
    label: 'Toko kelontong / sembako',
    hint: 'Banyak barang, ada barcode, catat stok',
    features: { stok: true, barcode: true, satuan: true, modifier: false,
                utang: true, modal: true, input: 'cari' },
    seedCategories: ['Sembako', 'Minuman', 'Snack', 'Rokok', 'Sabun & Deterjen'],
  },
  warungMakan: {
    label: 'Warung makan',
    hint: 'Menu tetap, ada tambahan seperti telur atau bungkus',
    features: { stok: true, barcode: false, satuan: false, modifier: true,
                utang: true, modal: false, input: 'grid' },
    seedCategories: ['Makanan', 'Minuman', 'Tambahan'],
  },
  kakiLima: {
    label: 'Gerobak / kaki lima',
    hint: 'Sedikit jenis, harga tetap, yang penting cepat',
    features: { stok: false, barcode: false, satuan: false, modifier: false,
                utang: false, modal: true, input: 'grid' },
    seedCategories: [],
  },
  jasa: {
    label: 'Jasa',
    hint: 'Tidak ada barang, hanya layanan',
    features: { stok: false, barcode: false, satuan: false, modifier: false,
                utang: true, modal: false, input: 'grid' },
    seedCategories: [],
  },
};
```

A preset is applied **once**, at onboarding. After that the flags belong to the shop and the preset name is only kept for analytics-free display in settings. Never re-apply a preset silently on update, or you will overwrite a shopkeeper's deliberate choice.

---

## 3. Profile notes

### kelontong

The heaviest profile and the reason `satuan` exists. Barcode scanning is the primary input, name search is the fallback, and the grid is not useful with hundreds of items.

Priorities in order: fast barcode-to-line, utang tracking, stock accuracy, margin. Product entry is the painful part, since seeding four hundred items by hand is a real barrier. Offer barcode-scan-then-fill entry so adding a product takes a scan plus two fields, and make the CSV import path good.

### warungMakan

The menu is small and stable, so the grid is the whole interface. Modifiers carry the variation.

Common modifier sets worth seeding: Telur, Pedas, Bungkus, Tanpa nasi, Es, Panas. Note that `modal` is off by default because these sellers do not track ingredient cost per portion, and asking them for a cost price on nasi goreng produces either a blank field or a made-up number that poisons the margin report.

Stock is on but only for items where the seller turns it on, typically bottled drinks and cigarettes, never cooked food.

### kakiLima

The speed profile. Everything is subordinate to closing a transaction in under three taps while a queue waits.

- Grid with large tiles, often one screen with no scrolling.
- Many sellers have a single price for everything, so support a "harga seragam" shortcut where one tile is tapped repeatedly.
- `utang` is off because credit is rare at a cart, but leave it switchable, since regulars at a fixed spot do run tabs.
- `modal` is on because these sellers genuinely care about margin per item, and the cost is easy for them to state (per biji).
- Printing is rare. Do not put printer setup in the onboarding path for this profile.
- The daily recap is the second most used screen. Make it reachable in one tap from Kasir.

### jasa

No goods, so no stock and no cost. Items are services with a fixed price. Utang matters because service customers often pay later.

Otherwise identical to kakiLima in interface terms.

---

## 4. Onboarding flow

Keep it to three screens, none of them skippable-but-confusing:

1. **Jenis usaha** — four large cards, each with `label` and `hint`. No "other" option, since any of the four is close enough and everything is editable later.
2. **Nama usaha** — one field. Used on the receipt header and nowhere else.
3. **Item pertama** — add one item immediately, inside onboarding, with only the fields the chosen profile needs. Getting a shopkeeper to their first successful sale in under a minute is the whole retention battle.

Do not ask for printer setup, tax settings, cash float, or a logo during onboarding. Each one is a place to abandon.

Offer a "Coba dulu dengan contoh" option that seeds five sample items for the chosen profile, so the app can be explored without any typing. Seeded items must be clearly marked and removable in one action.

---

## 5. Adding a new profile

Before adding one, check whether the need is really a new preset or just a flag the user should flip. Presets are for combinations that recur across many real sellers, not for one shop's preference.

A new profile needs: a `label`, a one-line `hint` in plain Bahasa, a complete `features` object, and seed categories or an empty array. If it needs a feature flag that does not exist yet, apply the rule from the main skill: the flag is only justified if at least two profiles differ on it.
