"use client";

import { countChars } from "@/lib/text/char-count";

/** Live character counter; counts emoji and accents as one character. */
export function CharCounter({ value, max }: { value: string; max: number }) {
  const n = countChars(value);
  return (
    <span className={`text-xs tabular-nums ${n > max ? "font-semibold text-danger" : "text-muted"}`} aria-live="polite">
      {n}/{max}
    </span>
  );
}
