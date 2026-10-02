import { describe, expect, test } from 'vitest';
import { normalisePhone, waLink } from './whatsapp.js';

describe('normalisePhone', () => {
  test.each([
    ['081234567890', '6281234567890'],
    ['0812-3456-7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['81234567890', '6281234567890'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalisePhone(raw)).toBe(expected);
  });

  test.each([null, '', '   ', '021555123', '12345', '0812', '+1 415 555 0100'])(
    'rejects %s',
    (raw) => {
      expect(normalisePhone(raw)).toBeNull();
    },
  );
});

describe('waLink', () => {
  test('opens the chat with the customer, message encoded', () => {
    expect(waLink('0812 3456 7890', 'Halo Bu, sisa Rp12.000')).toBe(
      'https://wa.me/6281234567890?text=Halo%20Bu%2C%20sisa%20Rp12.000',
    );
  });

  test('without a usable number WhatsApp asks who to send it to', () => {
    expect(waLink(null, 'Halo')).toBe('https://wa.me/?text=Halo');
    expect(waLink('021555123', 'Halo')).toBe('https://wa.me/?text=Halo');
  });
});
