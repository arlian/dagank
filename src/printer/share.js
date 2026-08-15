// The paths a shop without a thermal printer uses, which on iOS is every shop.
// Both work offline: sharing hands the text to another app on the device, and
// printing renders locally.

import { toText, WIDTH } from './receipt.js';

/**
 * Hands the struk to whatever the phone can share with, which in Indonesia
 * means WhatsApp. Falls back to the clipboard, since a struk the cashier can
 * paste is still a struk.
 */
export async function shareReceipt(lines, title = 'Struk') {
  const text = toText(lines);

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return { ok: true, cara: 'bagikan' };
    } catch (err) {
      // A dismissed share sheet is a decision, not a failure to report.
      if (err?.name === 'AbortError') return { ok: false, batal: true };
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return { ok: true, cara: 'salin' };
  }

  return { ok: false, batal: false };
}

/**
 * Prints through the browser, sized to 58mm paper. An iframe rather than a
 * popup, because a popup is blocked often enough to look like the button is
 * broken.
 */
export function printViaBrowser(lines, title = 'Struk') {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { margin: 0; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.35; }
  pre { margin: 0; white-space: pre-wrap; width: ${WIDTH}ch; }
  .b { font-weight: 700; }
  .g { font-weight: 700; font-size: 15px; }
</style></head><body>${lines
    .map((l) => `<pre class="${l.big ? 'g' : l.bold ? 'b' : ''}">${escapeHtml(l.text)}</pre>`)
    .join('')}</body></html>`);
  doc.close();

  frame.contentWindow.focus();
  frame.contentWindow.print();

  // Long enough for the print dialog to take its own copy of the document.
  setTimeout(() => frame.remove(), 1000);
}

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
