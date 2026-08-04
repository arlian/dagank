---
name: escpos-receipt
description: Printing struk to a 58mm Bluetooth thermal printer from the browser using ESC/POS over Web Bluetooth. Use this whenever the task involves printing, receipts, struk, nota, connecting or pairing a printer, cash drawer kick, receipt layout or column alignment, or a print preview. Trigger it before writing any printing code, because ESC/POS byte sequences, BLE chunking, and the fixed 32-character line width cannot be guessed correctly and a wrong guess produces a printer that silently prints nothing.
---

# Thermal receipt printing

Target hardware is the cheap 58mm Bluetooth thermal printer sold everywhere in Indonesia (Panda, Eppos, Kasir, generic RPP02N and clones). They speak ESC/POS over Bluetooth. A POS that cannot print a struk is not usable in a real shop, so treat printing as a core feature, not a nice-to-have.

Full command byte reference is in `references/escpos-commands.md`. Read it before emitting any control bytes.

## Platform reality, read this first

Web Bluetooth works in Chrome and Edge on Android, Windows, macOS, and Linux. **It does not work in any browser on iOS**, including Chrome on iOS, because all iOS browsers use WebKit. It also requires a secure context (https or localhost) and a user gesture to open the device chooser.

So the app needs two print paths:

1. **Bluetooth path** (Android, desktop Chrome): direct ESC/POS, the good experience.
2. **Fallback path** (iOS, unsupported browsers): render the receipt as HTML sized to 58mm and call `window.print()`, plus a "bagikan struk" option that shares the receipt as text or an image through the Web Share API so it can go to the customer over WhatsApp.

Feature-detect and never show a Bluetooth button that cannot work:

```js
export const canPrintBluetooth = () =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator;
```

## Connecting

Printers advertise one of a small set of serial-over-BLE services. Request all of them and take whichever the device exposes.

```js
const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // most common on RPP/Panda clones
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 style modules
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // some Zebra/ISSC based units
];

export async function pickPrinter() {
  const device = await navigator.bluetooth.requestDevice({
    filters: SERVICES.map((s) => ({ services: [s] })),
    optionalServices: SERVICES,
  });
  const server = await device.gatt.connect();

  for (const uuid of SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const chars = await service.getCharacteristics();
      const writable = chars.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse
      );
      if (writable) return { device, characteristic: writable };
    } catch { /* service not present on this device, try the next */ }
  }
  throw new Error('Printer tidak dikenali');
}
```

Notes that save hours of debugging:

- `requestDevice` must be called from a real user gesture. Calling it after an await in a click handler sometimes still works, but calling it from a timer or a promise chain that lost the gesture will throw.
- Do not hardcode a characteristic UUID. Enumerate and pick the first writable one, since clones vary.
- Store `device.id` and offer reconnect, but the browser still requires a user gesture the first time in each session. Design the till screen so the cashier taps "Sambungkan printer" once per session, not once per sale.
- Listen for `gattserverdisconnected` and surface it, because these printers drop the link when idle or when the battery is low.

## Writing bytes

BLE has a small MTU. Sending a whole receipt in one `writeValue` is the single most common cause of "the printer connected but nothing came out". Chunk it and pace it.

```js
const CHUNK = 180;

export async function write(characteristic, bytes) {
  const useNoResponse = characteristic.properties.writeWithoutResponse;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (useNoResponse) await characteristic.writeValueWithoutResponse(slice);
    else await characteristic.writeValue(slice);
    await new Promise((r) => setTimeout(r, 20));
  }
}
```

If a printer still drops output, lower `CHUNK` to 100 and raise the delay to 40ms before assuming anything else is wrong.

## Layout

Paper width is fixed and so is the character grid. **58mm at Font A is 32 characters per line.** Font B is 42. For 80mm paper it is 48 and 64. Everything is monospace, so layout is string padding, not CSS.

```js
export const WIDTH = 32;

export const leftRight = (l, r, w = WIDTH) => {
  const gap = Math.max(1, w - l.length - r.length);
  return l.slice(0, w - r.length - 1) + ' '.repeat(gap) + r;
};

export const center = (s, w = WIDTH) => {
  const pad = Math.max(0, Math.floor((w - s.length) / 2));
  return ' '.repeat(pad) + s;
};

export const divider = (ch = '-', w = WIDTH) => ch.repeat(w);
```

Standard struk shape for this app:

```
        TOKO BAROKAH
   Jl. Melati No. 12, Depok
       0812-3456-7890
--------------------------------
No  : TRX-20260803-0007
Tgl : 03/08/2026 19:42
Kasir: Ibu Sri
--------------------------------
Kopi Kapal Api 165g
  2 pcs x 3.000          6.000
Beras Pandan Wangi
  1,5 kg x 13.000       19.500
--------------------------------
Subtotal               25.500
Diskon                      0
Pembulatan                500
TOTAL                  26.000
Tunai                  30.000
Kembali                 4.000
--------------------------------
      Terima kasih :)
   Barang yang sudah dibeli
     tidak dapat ditukar
```

Layout rules that come from the paper, not from taste:

- Item name gets its own line, quantity and price go on an indented second line. Trying to fit a long product name and a price on one 32-character line truncates the name, and the shopkeeper needs to read the name.
- Right-align every amount to the paper edge.
- Print the total with double height (`ESC ! 0x10` or `GS ! 0x01`) so it is readable at a glance, then reset.
- Feed at least three or four lines before cutting, because the tear bar sits below the print head and the last lines otherwise stay inside the printer.
- Never print `costPrice` on a customer receipt.

## Receipts differ by business profile

Check `settings.features` before building or changing the receipt. See the kasir-domain skill and its `references/profil-usaha.md`.

- **kelontong**: the full struk above. Item name on its own line, quantity and price indented below, because product names are long.
- **warung makan**: same shape, plus chosen modifiers as an indented sub-line under the item (`  + Telur          5.000`). Never print a modifier the customer did not choose.
- **kaki lima**: most carts have no printer at all. Do not put printer setup anywhere in the onboarding path for this profile. When a printer does exist, print a minimal slip: shop name, total, date, nothing else. A twenty-line receipt for a two thousand rupiah purchase wastes paper the seller pays for.
- **jasa**: usually needs the service name and the date, and often a customer name, since the slip doubles as proof of an order.

Never print `cost` on any customer receipt, in any profile.

## Character encoding

These printers do not speak UTF-8. Send ASCII and you will never have a problem. Indonesian needs no accented characters, so:

- Strip or transliterate anything outside ASCII before printing (`é` to `e`, curly quotes to straight, `–` to `-`).
- Avoid emoji entirely. A smiley in the footer prints as garbage bytes on half of these devices.
- If a shop name genuinely needs an accented character, select a code page with `ESC t n` first and map the bytes, but treat that as an exception, not the default path.

```js
const toBytes = (s) => {
  const ascii = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return new TextEncoder().encode(ascii.replace(/[^\x00-\x7F]/g, '?'));
};
```

## Structure the code this way

Keep three separate layers so the receipt can be previewed and tested without hardware:

1. `buildReceipt(sale, shop)` returns an array of plain lines and formatting markers. Pure, testable, no bytes.
2. `toEscPos(lines)` turns that into a `Uint8Array`. Pure.
3. `printer.js` owns connection and writing. The only impure part.

This also gives the fallback path for free: the same line array renders to HTML for `window.print()` and to text for WhatsApp sharing.

## Cash drawer

Some shops have a drawer wired to the printer's RJ11 port. The kick is `ESC p 0 25 250`. Put it behind a setting that is off by default, since sending it to a printer with no drawer is harmless but pointless.

## Self-check

- Did I chunk the writes?
- Is the line width 32, not 40 or 48?
- Did I reset styles (`ESC @` at the start, and reset after any double-height section)?
- Did I feed before cutting?
- Is there a working non-Bluetooth path for iOS?
- Is the receipt builder pure and unit-testable?
