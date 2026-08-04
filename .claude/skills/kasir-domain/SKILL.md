---
name: kasir-domain
description: Core business rules for a point-of-sale app serving small Indonesian UMKM of any kind, including toko kelontong, warung sembako, warung makan, pedagang gorengan and other kaki lima, and simple service sellers. Use this whenever working on items, pricing, stock, sales transactions, customer credit (utang / kasbon), cash shifts, daily reports, or any money or unit calculation. Trigger it even when the request sounds like generic e-commerce or inventory work, because generic patterns (carts, shipping, decimal currency, mandatory stock) are wrong here, and because most features in this app are conditional on the shop's business profile rather than always present.
---

# Kasir domain rules

One app, one business, one device behind the counter. The business might be a kelontong with four hundred items and a barcode scanner, or a gorengan cart with six items all priced at a thousand rupiah. **The difference between them is configuration, not code.**

Read `references/profil-usaha.md` when working on onboarding, feature flags, or anything that behaves differently per business type. This file holds what is true for all of them.

The failure mode this skill prevents is twofold: generating a generic e-commerce app (carts, shipping, float money), and generating a kelontong-shaped app that buries a gorengan seller under barcode and stock fields they will never use.

## The profile principle

Every feature that is not universal sits behind a flag in shop settings. The onboarding question ("Jenis usaha kamu apa?") only picks a preset for those flags, and everything stays changeable afterwards.

```js
settings.features = {
  stok: true | false,        // stock tracking available at all
  barcode: true | false,     // scan button and barcode field
  satuan: true | false,      // multi-unit conversion (renceng, lusin, kodi)
  modifier: true | false,    // per-item add-ons (telur, bungkus, level pedas)
  utang: true | false,       // customer credit ledger
  modal: true | false,       // cost price and margin reporting
  input: 'grid' | 'cari',    // primary way items enter a transaction
};
```

Two rules keep this from turning into a configuration jungle:

- A new flag is only justified when **at least two profiles genuinely differ** on it. If only one profile differs, pick a sensible default and move on.
- Keep the total around eight flags. Needing a ninth usually means a new preset, not a new flag.

When a flag is off, the corresponding field is **absent from the form entirely**. Do not show it disabled, do not show it collapsed. An empty field a user cannot use is still a field they have to read past.

## Money

Rupiah has no fractional unit in practice. **Store every amount as an integer number of rupiah.** Never floats, never cents.

```js
export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n); // "Rp12.500"
```

Optional total rounding (`none`, `100`, `500`) applies to the transaction total only, never to line items, and is recorded in its own field so the numbers reconcile. Most UMKM are not PKP, so there is **no tax by default**.

## Items

The universal item is small. Everything beyond name and price is optional and profile-dependent.

```js
{
  id: '01J...',              // ULID, device-generated
  name: 'Gorengan',          // required
  price: 1000,               // required, integer
  active: true,
  category: null,            // optional, used to group the grid
  gridColor: null,           // optional, helps fast visual selection

  // present only when the matching feature is on
  barcode: null,
  cost: null,                // harga modal
  trackStock: false,         // PER ITEM, not global (see below)
  stock: null,               // counted in base unit
  minStock: null,
  units: null,               // [{ unit, factor, price }]
  modifiers: null,           // [{ name, price }]
}
```

**`trackStock` is a property of the item, not of the shop.** A warung makan does not count portions of nasi goreng but does want to know how many Teh Botol are left in the fridge. A global switch cannot express that, and this is the single most common modelling mistake when generalising this app.

### Units (`satuan`)

Only relevant when `features.satuan` is on, typically kelontong. A shop buys a carton and sells by the sachet, so model a base unit plus sell units with conversion factors:

```js
units: [
  { unit: 'pcs',     factor: 1,   price: 3000 },
  { unit: 'renceng', factor: 10,  price: 28000 },
  { unit: 'dus',     factor: 120, price: 320000 },
]
```

Support `pcs`, `renceng`, `lusin` (12), `kodi` (20), `dus`, `karton`, `pak`, `kg`, `ons` (100g in Indonesian usage, not the imperial ounce), `gram`, `liter`, `ml`, `ikat`, `butir`, `bungkus`. Weighed goods take a decimal quantity with a price per kg, but the resulting line total is always rounded to an integer.

**Stock always moves in the base unit.** Selling one renceng decrements ten pcs. Never keep parallel counts per unit.

### Modifiers

Only relevant when `features.modifier` is on, typically warung makan. Keep it to **one flat level**:

```js
modifiers: [
  { name: 'Telur',   price: 5000 },
  { name: 'Bungkus', price: 1000 },
]
```

No modifier groups, no required-choice rules, no nesting. That path leads to restaurant software, and a warung does not need it. Chosen modifiers are snapshotted onto the sale line with their prices.

## Sales transaction

A sale is immutable and append-only. Once saved it is never edited.

```js
{
  id: '01J...',
  number: 'TRX-20260803-0007',
  createdAt: 1754...,
  lines: [{ itemId, name, unit, qty, price, cost, modifiers, subtotal }],
  subtotal, discount, rounding, total,
  payment: { method: 'tunai' | 'utang' | 'transfer' | 'qris', paid, change },
  customerId: null,   // required when method is 'utang'
  status: 'selesai' | 'batal',
  voidOf: null,
}
```

Corrections are reversing transactions referencing the original through `voidOf`, never mutations or deletes. This keeps the cash report honest and makes any future device merge conflict-free.

Line values (`name`, `price`, `cost`, `modifiers`) are **denormalised on purpose**. A renamed or repriced item next month must not change last month's receipt or last month's margin.

## Utang / kasbon

Informal customer credit is what separates a useful app from a toy, and generic POS software omits it. On by default for kelontong and warung makan, off for kaki lima.

- Customer record is minimal: name, optional phone, optional note. No address, no email, no login.
- Paying with `utang` creates a sale where `paid` is less than `total`, plus a ledger entry.
- Repayments are recorded against the customer, **not against a specific sale**, because real shops pay down a running balance.
- The balance is derived by summing the ledger, never stored as a mutable field that can drift.
- What the shop actually needs: total owed per customer, who owes most, how old the debt is, and a shareable list of one customer's outstanding items.

## Stock

Applies only to items with `trackStock: true`.

- `stok opname` produces an adjustment record holding counted value, previous value, and difference, so shrinkage stays visible.
- **Stock may go negative. Warn, never block.** The shop sells what is physically there regardless of what the app believes, and blocking a sale over a wrong number is the fastest way to get the app abandoned.
- Movements are typed: sale, reversal, purchase (barang masuk), adjustment, waste (rusak or kadaluarsa). Movements are the truth, current stock is derived or cached.

## Cash and reports

- `kas awal` at open, `kas akhir` counted at close, with the app showing the expected figure and the `selisih`.
- The daily report the owner wants: total penjualan, total tunai, utang baru, pembayaran utang, laba kotor when `features.modal` is on, and best-selling items.
- Day boundaries use the device timezone, typically Asia/Jakarta. A UTC boundary puts an 8pm sale on the wrong day.
- For high-volume, low-value sellers (gorengan, minuman), the daily recap matters more than any per-transaction detail. That is often the only screen they open besides Kasir.

## Language and naming

Code identifiers in English (`costPrice`, `stockMovement`). Every string the user sees is Bahasa Indonesia, informal and short, kept in one strings module.

Use: Kasir, Barang, Stok, Utang, Pelanggan, Laporan, Pengaturan, Harga jual, Harga modal, Tunai, Kembalian, Struk, Batal, Simpan, Barang masuk, Stok opname.

Avoid: Checkout, Cart, SKU, Inventory, Invoice, Dashboard. They read as foreign software and slow people down.

## Things this app deliberately does not have

Do not add these unless explicitly asked, and push back when they are requested casually, because each adds setup burden to a user who will not complete it:

Shipping or delivery addresses, order status workflows, required product images, product variants beyond flat modifiers, multi-currency, user accounts with passwords, roles beyond a simple owner PIN, multi-outlet, supplier purchase orders with approvals, loyalty points, tax invoices, table management.

## Self-check

- Is every money value an integer?
- Does every sale line carry its own price, cost, and modifier snapshot?
- Is the new field gated behind the right feature flag, and absent (not disabled) when off?
- Is `trackStock` being read per item rather than globally?
- Does stock move in base units?
- Is the transaction record append-only?
- Would this screen still make sense to a gorengan seller with six items?
