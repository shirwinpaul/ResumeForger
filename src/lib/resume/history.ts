/**
 * Undo/redo history. Pure functions so they can be unit-tested and used from
 * a React reducer.
 *
 * Rapid edits to the same field (same `coalesceKey` within `coalesceMs`) are
 * merged into one undo step, so undo doesn't go back one keystroke at a time.
 */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  lastKey: string | null;
  lastAt: number;
}

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 1000;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 };
}

export function pushHistory<T>(
  h: History<T>,
  next: T,
  opts: { coalesceKey?: string; now?: number; coalesceMs?: number } = {},
): History<T> {
  if (Object.is(next, h.present)) return h;
  const now = opts.now ?? Date.now();
  const key = opts.coalesceKey ?? null;
  const merge =
    key !== null && key === h.lastKey && now - h.lastAt < (opts.coalesceMs ?? COALESCE_MS);
  const past = merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [], lastKey: key, lastAt: now };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future],
    lastKey: null,
    lastAt: 0,
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: next,
    future: rest,
    lastKey: null,
    lastAt: 0,
  };
}

/** Replace the present without creating an undo step (e.g. loading a version). */
export function resetHistory<T>(present: T): History<T> {
  return createHistory(present);
}
