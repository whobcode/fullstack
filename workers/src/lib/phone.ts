// Phone number normalization and keyed hashing.
//
// Every phone number is reduced to E.164 (+<country><subscriber>) before it is
// stored or compared, so that "(415) 555-0123", "415-555-0123" and
// "+1 415 555 0123" all resolve to the same account and the same contact match.

const DEFAULT_COUNTRY_CODE = '1'; // North America

/**
 * Normalizes a user-entered phone number to E.164, or returns null if it
 * cannot be read as a phone number.
 *
 * Handles the common shapes: a leading +, a leading 00 international prefix,
 * and bare national numbers (assumed to be DEFAULT_COUNTRY_CODE).
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();
  const hadPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');

  if (!digits) return null;

  if (!hadPlus) {
    if (digits.startsWith('00')) {
      // 00 is the international dialing prefix in much of the world.
      digits = digits.slice(2);
    } else if (digits.length === 10) {
      // A bare national number; assume the default country.
      digits = DEFAULT_COUNTRY_CODE + digits;
    } else if (digits.length === 11 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
      // Already carries the country code, just without the +.
    }
  }

  // E.164 allows at most 15 digits, and a country code plus a subscriber
  // number is never shorter than 8 in practice.
  if (digits.length < 8 || digits.length > 15) return null;

  return `+${digits}`;
}

/** Generates a numeric one-time code of the given length. */
export function generateOtp(length = 6): string {
  const digits = new Uint8Array(length);
  crypto.getRandomValues(digits);
  return Array.from(digits, d => (d % 10).toString()).join('');
}

/**
 * Renders a number for display without revealing it in full, e.g.
 * "+14155550123" -> "+1415•••0123". Used in the "we sent a code to..." copy.
 */
export function maskPhone(e164: string): string {
  if (e164.length <= 8) return e164;
  const head = e164.slice(0, e164.length - 7);
  const tail = e164.slice(-4);
  return `${head}•••${tail}`;
}
