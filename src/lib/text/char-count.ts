/**
 * Counts user-perceived characters (grapheme clusters), so an emoji such as 👩‍💻
 * or an accented letter counts as 1 — the way application forms usually count.
 */
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

export function countChars(text: string): number {
  if (!segmenter) return Array.from(text).length;
  return Array.from(segmenter.segment(text)).length;
}

/** Cuts `text` to at most `max` characters without splitting a grapheme. */
export function truncateChars(text: string, max: number): string {
  if (countChars(text) <= max) return text;
  const parts = segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
  return parts.slice(0, max).join("").trimEnd();
}
