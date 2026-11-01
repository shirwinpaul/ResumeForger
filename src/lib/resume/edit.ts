import type { ListSectionId, Resume } from "./schema";

/** Mutating helpers used inside `update(recipe)` drafts. */

type AnyItem = Record<string, unknown> & { id: string };

export function listOf(draft: Resume, section: ListSectionId): AnyItem[] {
  return draft[section] as unknown as AnyItem[];
}

export function setItemField(draft: Resume, section: ListSectionId, id: string, key: string, value: unknown) {
  const item = listOf(draft, section).find((i) => i.id === id);
  if (item) item[key] = value;
}

export function moveInArray<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * No-AI fallback for "Turn into bullets": splits a plain answer into short
 * sentences, capitalises them and drops filler openers. Never adds words.
 */
export function sentencesToBullets(text: string, max = 4): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\s*[\n;•]\s*/)
    .map((s) =>
      s
        .trim()
        .replace(/^(and|also|then|so)\s+/i, "")
        .replace(/[.!]+$/, ""),
    )
    .filter((s) => s.split(" ").length >= 3)
    .slice(0, max)
    .map((s) => s[0].toUpperCase() + s.slice(1));
}
