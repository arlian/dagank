// Receipt lines to ESC/POS bytes. Pure, so the encoder is unit-testable with
// no printer in the room.

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const INIT = [ESC, 0x40]; // clears alignment, size and emphasis left by the last job
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const BIG_ON = [GS, 0x21, 0x01]; // height x2, width x1: 32 columns survive
const BIG_OFF = [GS, 0x21, 0x00];

/** Feed past the tear bar, which sits below the print head. */
const FEED = [ESC, 0x64, 0x04];

/** Harmless on a printer with no drawer wired to its RJ11 port. */
export const KICK_DRAWER = [ESC, 0x70, 0x00, 0x19, 0xfa];

const COMBINING = /[̀-ͯ]/g;
const QUOTES = /[‘’]/g;
const DOUBLE_QUOTES = /[“”]/g;
const DASHES = /[–—]/g;

/**
 * These printers do not speak UTF-8, and Indonesian needs nothing outside
 * ASCII. Accents are stripped rather than sent, because an unmapped byte
 * prints as garbage on half of these devices.
 */
export function encodeAscii(s) {
  const ascii = String(s)
    .normalize('NFD')
    .replace(COMBINING, '') // accents, detached from their letter by NFD
    .replace(QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')
    .replace(/[^\x20-\x7e]/g, '?');
  return new TextEncoder().encode(ascii);
}

export function toEscPos(lines = [], { drawer = false } = {}) {
  const parts = [new Uint8Array(INIT)];

  for (const line of lines) {
    if (line.bold) parts.push(new Uint8Array(BOLD_ON));
    if (line.big) parts.push(new Uint8Array(BIG_ON));

    parts.push(encodeAscii(line.text ?? ''));
    parts.push(new Uint8Array([LF]));

    // Reset immediately rather than at the end: a job that fails halfway must
    // not leave the printer in double height for the next receipt.
    if (line.big) parts.push(new Uint8Array(BIG_OFF));
    if (line.bold) parts.push(new Uint8Array(BOLD_OFF));
  }

  parts.push(new Uint8Array(FEED));
  if (drawer) parts.push(new Uint8Array(KICK_DRAWER));

  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
