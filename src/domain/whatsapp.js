// Reminding a customer about their utang, through the app every one of them
// already has open. Nothing here sends anything: it only builds a link, and
// the owner presses send in WhatsApp themselves.

/**
 * A number as people actually write it down, "0812-3456-7890", "+62 812...",
 * "812 3456 7890", into the 62... form wa.me expects. Null when it cannot be
 * an Indonesian mobile number, so the caller can fall back rather than open a
 * chat with a stranger.
 */
export function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  if (!digits.startsWith('628')) return null;
  // 628 plus 8 to 12 more digits covers every operator's numbering.
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/**
 * With a number, opens the chat with that customer. Without one, WhatsApp
 * asks which chat to send to, which is still one tap from a reminder.
 */
export function waLink(phone, text) {
  const nomor = normalisePhone(phone);
  return `https://wa.me/${nomor ?? ''}?text=${encodeURIComponent(text)}`;
}
