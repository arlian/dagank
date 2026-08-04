---
name: ui-kasir
description: Interface, interaction, and Bahasa Indonesia copy rules for a point-of-sale used one-handed on a phone at a counter or a street cart. Use this whenever building or changing any screen, component, form, button, error message, empty state, grid or search layout, or user-facing string in this app. Trigger it even for small UI tweaks, because the constraints here (tap target size, thumb reach, sunlight contrast, keypad entry, grid versus search input modes, informal Bahasa) are not the defaults of any component library, and generic UI will be slower to use than the notebook it replaces.
---

# Interface rules for the counter

Picture the actual user: a shop owner or a cart seller, phone in one hand, a customer waiting, daylight on the screen, possibly reading glasses, often no experience with software of this kind. The competition is a paper notebook and a calculator, and the notebook is fast.

Every rule here serves one number: **taps to complete a typical sale.** Target is under six for a two-item cash transaction, under four for a single-item cart sale.

## Physical constraints

- **Minimum tap target 48 by 48 CSS pixels**, at least 8px apart. Cheap phone, imprecise touch, hurried hands.
- **Primary actions in the bottom third**, inside the thumb arc. Never put "Bayar" in a top-right corner.
- **16px minimum on any input**, because iOS zooms the viewport on focus below that and the zoom is disorienting mid-sale. 18px for body text.
- **High contrast, well past WCAG AA.** These screens get used in daylight with brightness turned down to save battery.
- **No hover states carrying meaning.** Touch has no hover.
- **No swipe-only or drag-only actions.** Every gesture shortcut needs a visible button equivalent.
- Portrait only.

## The two input modes

`settings.features.input` decides the shape of the Kasir screen. This is the biggest single difference between business profiles, so check it before building anything on that screen.

### Mode `grid` (kaki lima, warung makan, jasa)

The item board **is** the interface. No search field, no scan button.

- Large tiles, ideally the whole item set visible with no scrolling. Aim for 6 to 12 tiles on one screen.
- Tile shows name and price, nothing else. Optional `gridColor` helps a seller find a tile by shape and colour rather than by reading.
- One tap adds the item. Tapping the same tile again increments quantity. **Never open a modal asking for quantity**, that doubles the taps on the most frequent action.
- Categories become a single row of chips above the grid, only when item count exceeds one screen.
- When `features.modifier` is on, modifiers appear as chips on the line item after adding, not as a blocking dialog before it.
- For sellers with one uniform price, support a "harga seragam" tile that increments a count.

### Mode `cari` (kelontong)

Hundreds of items make a grid useless.

- Large scan button and a search field at the top, both reachable but the scan button larger, since it is the faster path.
- Search matches name and barcode simultaneously, results after two characters.
- A tapped result is added immediately at quantity one.
- Keep a small "sering dibeli" row of the top few items above the search field. It recovers most of the grid's speed for the twenty percent of sales that are one item of the same thing.

Both modes share the same bottom section: the running lines, the total, and the pay button.

## Numeric entry

Money and quantity entry happen dozens of times a day and are where bad interface hurts most.

- **Custom on-screen keypad for money**, not the system keyboard. Large keys, no autocorrect, no accidental letters, and room for a "000" key, which matters enormously with rupiah.
- Quick-amount buttons for cash tendered: 2.000, 5.000, 10.000, 20.000, 50.000, 100.000, plus "Uang pas". This removes most typing from the payment step. Adjust the set to the profile's average transaction value.
- Format with thousand separators as the user types, keep the stored value an integer.
- `inputMode="numeric"` anywhere the system keyboard is used.
- Never require a decimal point. Weighed goods get a dedicated entry with a "kg / gram" toggle instead of expecting someone to type `1.5`.

## Screen structure

A bottom tab bar with at most five destinations, and **the tabs themselves are profile-dependent**:

- Always: **Kasir, Barang, Laporan, Pengaturan**
- Plus **Utang** when `features.utang` is on

Kasir is home and the app always opens there. The pay button always carries the total on it, "Bayar Rp26.000", because the shopkeeper reads that number out loud to the customer, so it must be the largest thing on screen.

For high-volume low-value profiles, put the day's running total somewhere permanently visible on Kasir. It is the number those sellers check most often.

## Copy

All user-facing text is Bahasa Indonesia, informal, short, in one strings module.

- Everyday words: Simpan, Batal, Hapus, Cari barang, Tambah barang, Bayar, Kembalian, Selesai, Sudah lunas, Belum lunas.
- Not "Transaksi berhasil diproses" but "Selesai".
- Errors say what happened and what to do, one line, no codes: "Nama barang belum diisi", not "Validation failed".
- Confirm only destructive and irreversible actions. Confirming a normal sale is an extra tap on the most frequent action in the app.
- Empty states teach the next action: "Belum ada barang. Tambah barang pertama kamu." with the button right there.
- All numbers use `id-ID` formatting.
- Terminology follows the profile where it differs naturally: a warung makan sells "menu", a kelontong sells "barang". Keep both in the strings module keyed by profile rather than hardcoding one.

## Forms follow the flags

The item form is the place where generalisation succeeds or fails. Build it from `settings.features`, and when a flag is off the field is **absent**, not disabled and not collapsed behind a toggle.

For `kakiLima` the entire item form should be two fields, name and price. If a gorengan seller sees a barcode field, the app has failed at exactly the moment it needed to earn trust.

## Feedback

- Every write confirms immediately. Writes are local, so they really are instant. **A spinner on save means a bug**, not a slow network.
- Short haptic (`navigator.vibrate(30)`) on scan success and sale completion. In a noisy shop, touch beats sound.
- Printer status indicator on Kasir when printing is available on the device: connected, disconnected, unavailable. A cashier must never discover a printer problem only after finishing a sale.
- **No offline banner.** The app is always offline by design and a warning implies breakage. Connection state is surfaced only for the printer, and for backup if sync is ever enabled.

## Accessibility for the actual users

- Respect the system font scale. Do not lock text containers to px in a way that breaks at 200%.
- Shallow hierarchy: one heading, one list, one action per screen.
- Colour is never the only signal. "Belum lunas" gets both red and the word.
- Icons always carry a text label. Icon-only buttons are guesswork for someone who has never used this kind of software.

## Visual direction

Plain and sturdy, not trendy. Light background, one strong accent used only for the primary action, generous spacing, large type, minimal decoration. No dark mode in v1, since daylight readability is the real requirement and dark mode doubles the testing. No animation beyond state transitions under 150ms, because animation on a cheap Android reads as lag.

## Self-check

- Did I read `features.input` before touching the Kasir screen?
- Are fields for disabled features absent rather than disabled?
- Can this screen be operated with one thumb, in portrait, without zooming?
- Are all targets at least 48px?
- Is every new string in Bahasa and in the strings module?
- Did I add taps to the sale flow? Can I remove one instead?
- Would this screen still make sense with six items and no barcodes?
