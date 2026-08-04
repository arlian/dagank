# ESC/POS command reference for 58mm thermal printers

Contents:
1. Constants and helpers
2. Initialisation and formatting
3. Alignment
4. Text size and emphasis
5. Feed and cut
6. Code pages
7. Barcodes and QR
8. Images
9. Cash drawer
10. Status and known clone quirks

Byte values are shown in hex. `n` means a single parameter byte.

---

## 1. Constants and helpers

```js
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

class Builder {
  constructor() { this.parts = []; }
  raw(...bytes) { this.parts.push(new Uint8Array(bytes)); return this; }
  text(s) { this.parts.push(encodeAscii(s)); return this; }
  line(s = '') { return this.text(s).raw(LF); }
  build() {
    const len = this.parts.reduce((a, p) => a + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of this.parts) { out.set(p, o); o += p.length; }
    return out;
  }
}
```

---

## 2. Initialisation and formatting

| Purpose | Bytes | Notes |
|---|---|---|
| Initialise / reset all settings | `1B 40` | Always send first. Clears alignment, size, emphasis. |
| Line feed | `0A` | |
| Set line spacing to default | `1B 32` | |
| Set line spacing to n dots | `1B 33 n` | n around 24 to 30 is normal. Lower it to fit more lines. |

Send `1B 40` at the start of every print job, not just at connection. Printers keep state between jobs and a leftover double-width setting will wreck the next receipt.

---

## 3. Alignment

`1B 61 n`

| n | Result |
|---|---|
| `00` | left |
| `01` | center |
| `02` | right |

Alignment applies to whole lines. For columns within a line, pad strings yourself. Right-aligning amounts with `1B 61 02` puts them at the paper edge but breaks the left column, so use padding instead.

---

## 4. Text size and emphasis

**Print mode, `1B 21 n`** where n is a bitmask:

| Bit | Value | Effect |
|---|---|---|
| 0 | `01` | Font B (smaller, 42 cols on 58mm) |
| 3 | `08` | Emphasised / bold |
| 4 | `10` | Double height |
| 5 | `20` | Double width |
| 7 | `80` | Underline |

Example, bold double-height for the total line: `1B 21 18`, then text, then `1B 21 00` to reset.

**Character size, `1D 21 n`**: high nibble is width multiplier minus 1, low nibble is height multiplier minus 1. `1D 21 11` is 2x2. Supported more consistently across clones than `1B 21` for size, so prefer it for scaling and use `1B 21 08` only for bold.

**Bold on its own**: `1B 45 01` on, `1B 45 00` off.

**Underline**: `1B 2D 01` (1 dot) or `1B 2D 02` (2 dots), `1B 2D 00` off.

**Inverted (white on black)**: `1D 42 01` on, `1D 42 00` off. Useful for a "LUNAS" or "UTANG" stamp. Not supported on every clone, so never rely on it for meaning.

---

## 5. Feed and cut

| Purpose | Bytes |
|---|---|
| Feed n lines | `1B 64 n` |
| Feed n dots | `1B 4A n` |
| Full cut | `1D 56 00` |
| Partial cut | `1D 56 01` |
| Feed then partial cut | `1D 56 42 n` |

Most cheap 58mm units have no cutter at all and ignore the cut command harmlessly. Always feed 3 to 5 lines at the end (`1B 64 04`) so the printed area clears the tear bar. Sending only a cut with no feed on a cutterless printer leaves the last lines invisible inside the mechanism, which reads to the user as "the printer skipped part of my receipt".

---

## 6. Code pages

`1B 74 n` selects a character code table.

| n | Table |
|---|---|
| `00` | PC437 USA / Standard Europe |
| `02` | PC850 Multilingual |
| `10` | WPC1252 |

Indonesian needs no characters outside ASCII, so the correct default is to send pure ASCII and not touch this command at all. Only reach for it if a shop name contains an accented character, and test on the actual hardware, since clone support is inconsistent.

---

## 7. Barcodes and QR

**Barcode**, `1D 6B m` followed by data.

| Setting | Bytes |
|---|---|
| Height in dots | `1D 68 n` (n around 50 to 80) |
| Width | `1D 77 n` (n 2 or 3) |
| HRI position | `1D 48 n` (0 none, 1 above, 2 below) |
| Print CODE128 | `1D 6B 49 len {B` + data |
| Print EAN13 | `1D 6B 43 0C` + 12 digits |

For CODE128 the data must be prefixed with a code set selector, commonly `7B 42` for `{B`.

**QR code** (model 2), a four-step sequence:

```
1D 28 6B 04 00 31 41 32 00     select model 2
1D 28 6B 03 00 31 43 n         module size, n = 3..8
1D 28 6B 03 00 31 45 30        error correction level L
1D 28 6B pL pH 31 50 30 <data> store data, len = data.length + 3
1D 28 6B 03 00 31 51 30        print
```

Where `pL = len & 0xFF` and `pH = len >> 8`.

QR support is patchy on the cheapest clones. If a QRIS code must appear on the receipt, print it as a raster image instead, which is universally supported.

---

## 8. Images

Raster bit image: `1D 76 30 m xL xH yL yH` followed by packed 1-bit data, 8 pixels per byte, MSB first, row by row.

- `m = 0` for normal scale.
- `xL, xH` is the row width **in bytes**, so a 384 pixel wide image is 48 bytes, giving `xL = 0x30, xH = 0x00`.
- `yL, yH` is the height in dots.

**384 dots is the full printable width on 58mm** (576 on 80mm). Render the logo or QR to a canvas at exactly 384 wide, threshold to pure black and white (do not dither text, it turns to mud), then pack.

```js
function packMonochrome(imageData, w, h) {
  const bytesPerRow = Math.ceil(w / 8);
  const out = new Uint8Array(bytesPerRow * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
      if (lum < 128) out[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return out;
}
```

Images are slow to transmit over BLE. A full-width logo can take several seconds. Keep logos short in height, under about 100 dots, or the cashier will think the app has frozen.

---

## 9. Cash drawer

`1B 70 m t1 t2` where m is `00` or `01` for the connector pin, and t1, t2 control the pulse. `1B 70 00 19 FA` is a safe common value.

Harmless on a printer with no drawer attached.

---

## 10. Known clone quirks

- **Nothing prints, no error**: writes were too large. Chunk to 180 bytes or less with a pause between chunks.
- **First line missing**: no `1B 40` sent, or the printer was still waking. Send init, then a short feed, before content.
- **Garbled characters**: non-ASCII bytes sent without a code page. Strip to ASCII.
- **Last lines never appear**: no feed before cut. Add `1B 64 04`.
- **Prints once then dies until repaired**: the device dropped GATT. Handle `gattserverdisconnected` and reconnect on demand.
- **Double width stuck on**: a previous job left print mode set. Always start with `1B 40`.
- **Very slow output**: an image is being sent, or the chunk delay is too high. Lower the delay before lowering the chunk size.
