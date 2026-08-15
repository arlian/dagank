import { describe, expect, it } from 'vitest';
import { encodeAscii, KICK_DRAWER, toEscPos } from './escpos.js';

const bytes = (lines, opts) => Array.from(toEscPos(lines, opts));
const has = (haystack, needle) =>
  haystack.some((_, i) => needle.every((b, j) => haystack[i + j] === b));

describe('encodeAscii', () => {
  it('leaves plain Indonesian alone', () => {
    expect(new TextDecoder().decode(encodeAscii('Nasi goreng 2x'))).toBe('Nasi goreng 2x');
  });

  // An unmapped byte prints as garbage on half of these devices.
  it('strips accents down to their base letter', () => {
    expect(new TextDecoder().decode(encodeAscii('Café Crème'))).toBe('Cafe Creme');
  });

  it('flattens curly quotes and long dashes, which paper cannot render', () => {
    expect(new TextDecoder().decode(encodeAscii('‘a’ “b” –'))).toBe(
      "'a' \"b\" -",
    );
  });

  it('replaces an emoji rather than emitting a multi-byte sequence', () => {
    const out = new TextDecoder().decode(encodeAscii('Terima kasih \u{1F60A}'));
    expect(out.startsWith('Terima kasih ')).toBe(true);
    expect(/[^\x20-\x7e]/.test(out)).toBe(false);
  });
});

describe('toEscPos', () => {
  const line = { text: 'Halo' };

  // A leftover double-width setting from the last job wrecks this receipt.
  it('resets the printer before anything else', () => {
    expect(bytes([line]).slice(0, 2)).toEqual([0x1b, 0x40]);
  });

  // The tear bar sits below the print head: without this the last lines stay
  // inside the mechanism and read as "the printer skipped part of my receipt".
  it('feeds past the tear bar at the end', () => {
    expect(has(bytes([line]), [0x1b, 0x64, 0x04])).toBe(true);
  });

  it('ends every line with a feed', () => {
    expect(bytes([{ text: 'A' }, { text: 'B' }]).filter((b) => b === 0x0a)).toHaveLength(2);
  });

  it('doubles height without doubling width, so 32 columns survive', () => {
    const out = bytes([{ text: 'TOTAL', big: true }]);
    expect(has(out, [0x1d, 0x21, 0x01])).toBe(true);
    expect(has(out, [0x1d, 0x21, 0x20])).toBe(false); // double width
  });

  // A job that fails halfway must not leave the next receipt in double height.
  it('turns styling off again on the same line it turned it on', () => {
    const out = bytes([{ text: 'TOTAL', big: true, bold: true }, { text: 'Tunai' }]);
    expect(has(out, [0x1d, 0x21, 0x00])).toBe(true);
    expect(has(out, [0x1b, 0x45, 0x00])).toBe(true);
  });

  it('leaves the drawer alone unless the shop asked for it', () => {
    expect(has(bytes([line]), KICK_DRAWER)).toBe(false);
    expect(has(bytes([line], { drawer: true }), KICK_DRAWER)).toBe(true);
  });

  it('returns bytes, not a string', () => {
    expect(toEscPos([line])).toBeInstanceOf(Uint8Array);
  });

  it('survives an empty receipt without throwing', () => {
    expect(toEscPos([]).length).toBeGreaterThan(0);
  });
});
