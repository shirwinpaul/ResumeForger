/**
 * Honesty check (no AI). After any AI rewrite, every number, percentage,
 * currency amount, date or capitalised proper noun in the output that was NOT
 * in the user's original content is flagged:
 *   "⚠️ New detail — confirm it's true or remove it"
 * `[bracket placeholders]` are expected (the AI asks the user to fill them)
 * and are never flagged here — they're tracked by the placeholder checklist.
 */

export type DetailKind = "number" | "percent" | "currency" | "date" | "proper-noun";

export interface NewDetail {
  kind: DetailKind;
  /** The exact text as it appears in the output. */
  text: string;
  /** Character offset in the output (for highlighting). */
  index: number;
}

export const NEW_DETAIL_MESSAGE = "⚠️ New detail — confirm it's true or remove it";

const MONTHS =
  "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december";

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
  thousand: 1000, dozen: 12, dozens: 12, hundreds: 100, thousands: 1000, million: 1e6, lakh: 1e5, crore: 1e7,
};

/**
 * Words that start sentences/bullets or are capitalised for style but are not
 * proper nouns. Also includes common resume action verbs.
 */
const COMMON_WORDS = new Set(
  `a an the and or but if of in on at to for with by from as into onto over under about after before during
  i we our my me he she they them their this that these those it its there here who what when where why how
  all any each every few more most other some such no not only own same so than too very can will just also
  achieved addressed administered advised analysed analyzed arranged assembled assessed assisted automated
  boosted built calculated championed coached collaborated collected compiled completed composed conducted
  configured contributed coordinated created curated debugged decreased defined delivered demonstrated
  designed developed devised directed documented drafted drove edited educated enabled engineered enhanced
  established evaluated executed expanded facilitated fixed formulated founded gathered generated guided
  handled hosted identified illustrated implemented improved increased initiated innovated inspired
  installed integrated interviewed introduced investigated launched led learned lectured maintained managed
  mentored modelled modeled monitored motivated negotiated operated optimised optimized orchestrated
  organised organized oversaw participated performed persuaded pioneered planned played prepared presented
  prioritised prioritized produced programmed promoted proposed prototyped provided published raised
  ran recruited redesigned reduced refactored represented researched resolved restructured reviewed revamped
  scheduled secured served shaped simplified solved spearheaded streamlined strengthened structured
  supervised supported surveyed taught tested trained transformed translated tutored unified updated
  upgraded used utilised utilized volunteered won worked wrote
  responsible helped participated member volunteer student students team teams club clubs school college
  university project projects first second third new key top best several many various multiple weekly
  daily monthly annual summer winter spring autumn fall present current currently
  coursework award awards competition competitions honours honors finalist winner runner-up`
    .split(/\s+/)
    .filter(Boolean),
);

/** Lower-cased word tokens (letters/digits, keeping things like "c++", "node.js"). */
function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]*[a-z0-9+#]|[a-z0-9]/g) ?? []).map((t) => t.replace(/\.$/, ""));
}

function stripPlaceholders(text: string): string {
  return text.replace(/\[[^\]\n]{1,80}\]/g, (m) => " ".repeat(m.length));
}

/** Normalises a numeric string: "1,200" → "1200", "3.50" → "3.5". */
function normNumber(raw: string): string {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? String(n) : raw;
}

interface Found {
  kind: DetailKind;
  text: string;
  index: number;
  /** Normalised keys; the detail is "known" if ANY key is in the source. */
  keys: string[];
}

function findDetails(text: string): Found[] {
  const t = stripPlaceholders(text);
  const found: Found[] = [];
  const taken: [number, number][] = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);
  const add = (f: Found) => {
    const end = f.index + f.text.length;
    if (overlaps(f.index, end)) return;
    taken.push([f.index, end]);
    found.push(f);
  };

  // Currency: ₹500, Rs. 2,000, $5k, INR 300, 5 lakh rupees, €20
  const currency = /(?:[₹$€£]|\b(?:rs\.?|inr|usd|eur|gbp)\s?)\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|lakh|lakhs|crore|crores)?\b|\b\d[\d,]*(?:\.\d+)?\s?(?:rupees|dollars|euros|pounds)\b/gi;
  for (const m of t.matchAll(currency)) {
    const num = m[0].match(/\d[\d,]*(?:\.\d+)?/)![0];
    add({ kind: "currency", text: m[0].trim(), index: m.index!, keys: [`n:${normNumber(num)}`] });
  }

  // Dates: "June 2024", "Jun '24", "2023–2024", "2024"
  const monthYear = new RegExp(`\\b(?:${MONTHS})\\.?\\s+(?:'\\d{2}|\\d{4})\\b`, "gi");
  for (const m of t.matchAll(monthYear)) {
    const year = m[0].match(/\d{2,4}$/)![0];
    add({ kind: "date", text: m[0], index: m.index!, keys: [`n:${year.length === 2 ? `20${year}` : year}`] });
  }
  for (const m of t.matchAll(/\b(19|20)\d{2}\b/g)) {
    add({ kind: "date", text: m[0], index: m.index!, keys: [`n:${m[0]}`] });
  }

  // Percentages: 40%, 40 %, 40 percent
  for (const m of t.matchAll(/\b\d+(?:\.\d+)?\s?(?:%|percent\b)/gi)) {
    const num = m[0].match(/\d+(?:\.\d+)?/)![0];
    add({ kind: "percent", text: m[0], index: m.index!, keys: [`n:${normNumber(num)}`] });
  }

  // Plain numbers (incl. 1,200 / 3.5 / 10x / 500+) and number words
  for (const m of t.matchAll(/\b\d[\d,]*(?:\.\d+)?\+?(?:x\b)?/gi)) {
    const num = m[0].match(/\d[\d,]*(?:\.\d+)?/)![0];
    add({ kind: "number", text: m[0], index: m.index!, keys: [`n:${normNumber(num)}`] });
  }
  for (const m of t.matchAll(new RegExp(`\\b(?:${Object.keys(NUMBER_WORDS).join("|")})\\b`, "gi"))) {
    add({ kind: "number", text: m[0], index: m.index!, keys: [`n:${NUMBER_WORDS[m[0].toLowerCase()]}`] });
  }

  // Proper nouns: capitalised or ALL-CAPS words (e.g. Google, AWS, JavaScript, Node.js).
  const word = /[A-Z][A-Za-z0-9]*(?:[.+#-][A-Za-z0-9+#]+)*\+*#?/g;
  for (const m of t.matchAll(word)) {
    const w = m[0];
    const lower = w.toLowerCase();
    if (w.length < 2 && w !== "C") continue;
    if (COMMON_WORDS.has(lower)) continue;
    // Sentence/bullet starts are usually verbs ("Spearheaded"), not names.
    const before = t.slice(0, m.index).trimEnd();
    const sentenceStart = before === "" || /[.!?:;•\-–—\n(]$/.test(before);
    const isAllCaps = w.length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w);
    if (sentenceStart && !isAllCaps && /^[A-Z][a-z]+$/.test(w) && /(ed|ing|es|s|ly)$/.test(lower)) continue;
    add({ kind: "proper-noun", text: w, index: m.index!, keys: [`w:${lower}`] });
  }

  return found.sort((a, b) => a.index - b.index);
}

/** Builds the set of known keys from the user's original content. */
function knownKeys(sources: string[]): Set<string> {
  const keys = new Set<string>();
  for (const src of sources) {
    for (const f of findDetails(src)) f.keys.forEach((k) => keys.add(k));
    for (const tok of tokens(src)) {
      keys.add(`w:${tok}`);
      if (/^\d[\d,]*(?:\.\d+)?$/.test(tok)) keys.add(`n:${normNumber(tok)}`);
      if (tok in NUMBER_WORDS) keys.add(`n:${NUMBER_WORDS[tok]}`);
    }
  }
  return keys;
}

/**
 * Returns details in `output` that don't appear anywhere in `original`.
 * `original` can be several strings (e.g. the bullet plus its project's name/tech).
 */
export function findNewDetails(original: string | string[], output: string): NewDetail[] {
  const sources = Array.isArray(original) ? original : [original];
  const known = knownKeys(sources);
  return findDetails(output)
    .filter((f) => !f.keys.some((k) => known.has(k)))
    .map(({ kind, text, index }) => ({ kind, text, index }));
}

/** Splits text into segments for highlighting new details in the UI. */
export function highlightSegments(output: string, details: NewDetail[]): { text: string; flagged: boolean }[] {
  const segs: { text: string; flagged: boolean }[] = [];
  let pos = 0;
  for (const d of details) {
    if (d.index < pos) continue;
    if (d.index > pos) segs.push({ text: output.slice(pos, d.index), flagged: false });
    segs.push({ text: output.slice(d.index, d.index + d.text.length), flagged: true });
    pos = d.index + d.text.length;
  }
  if (pos < output.length) segs.push({ text: output.slice(pos), flagged: false });
  return segs;
}
