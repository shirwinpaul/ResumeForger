/**
 * Contact stripping — runs on the server for EVERY AI request (and the client
 * never puts contact fields into AI inputs in the first place).
 * Removes email addresses, phone numbers and street addresses from any string,
 * and drops contact-like keys from objects entirely.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// 8+ digits with optional +country code and separators, e.g. +91 98765 43210, (555) 123-4567.
const PHONE = /(?<![\w/])\+?\d[\d\s().-]{6,}\d(?![\w/])/g;
const STREET =
  /\b\d{1,5}[ ,]+(?:[A-Za-z0-9.'-]+\s){0,4}(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|nagar|colony|marg|sector|block|apartment|apt\.?|flat|house|layout|cross|main)\b[^\n,]*/gi;
const PIN = /\b(?:pin(?:code)?|zip(?:code)?|postal code)\s*[:-]?\s*\d{5,6}\b/gi;

const CONTACT_KEYS = new Set(["email", "phone", "address", "street", "city", "state", "postcode", "pincode", "zip", "contact", "photo"]);

function countDigits(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

export function scrubText(text: string): string {
  return text
    .replace(EMAIL, "[email removed]")
    .replace(PHONE, (m) => {
      // Keep years, ranges ("2022-2024") and small numbers; only strip phone-length digit runs.
      const digits = countDigits(m);
      if (digits < 8 || digits > 15) return m;
      if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(m.trim())) return m;
      return "[phone removed]";
    })
    .replace(STREET, "[address removed]")
    .replace(PIN, "[address removed]");
}

/** Deep-copies `value`, scrubbing strings and dropping contact keys. */
export function stripContact<T>(value: T): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (Array.isArray(value)) return value.map((v) => stripContact(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CONTACT_KEYS.has(k.toLowerCase())) continue;
      out[k] = stripContact(v);
    }
    return out as T;
  }
  return value;
}
