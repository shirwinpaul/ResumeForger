/**
 * Resume storage — browser only (IndexedDB via idb-keyval, falling back to
 * localStorage). Nothing is ever sent to a server.
 *
 * Layout: one key per resume (`resume:<id>`) plus an index of summaries, so
 * the start screen can list versions without loading every resume.
 */
import { migrateResume, newId, type Resume } from "./schema";

export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

export interface ResumeSummary {
  id: string;
  name: string;
  updatedAt: string;
  targetType: string;
  template: string;
}

const INDEX_KEY = "resume-index";
const ACTIVE_KEY = "resumeforge:active";
const resumeKey = (id: string) => `resume:${id}`;

/** In-memory store — used in tests and when browser storage is unavailable. */
export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return structuredClone(map.get(key)) as T | undefined;
    },
    async set(key, value) {
      map.set(key, structuredClone(value));
    },
    async del(key) {
      map.delete(key);
    },
  };
}

function createLocalStorageStore(): KeyValueStore {
  const prefix = "resumeforge:kv:";
  return {
    async get<T>(key: string) {
      const raw = window.localStorage.getItem(prefix + key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    },
    async set(key, value) {
      window.localStorage.setItem(prefix + key, JSON.stringify(value));
    },
    async del(key) {
      window.localStorage.removeItem(prefix + key);
    },
  };
}

async function createIdbStore(): Promise<KeyValueStore> {
  const idb = await import("idb-keyval");
  // Probe once — private browsing modes can make IndexedDB throw.
  await idb.get("__probe__");
  return { get: idb.get, set: idb.set, del: idb.del };
}

let browserStore: Promise<KeyValueStore> | null = null;

export function getBrowserStore(): Promise<KeyValueStore> {
  browserStore ??= createIdbStore().catch(() => {
    try {
      window.localStorage.setItem("resumeforge:probe", "1");
      return createLocalStorageStore();
    } catch {
      return createMemoryStore();
    }
  });
  return browserStore;
}

export class StorageFullError extends Error {
  constructor() {
    super("Your browser storage is full. Export a JSON backup and delete old versions.");
    this.name = "StorageFullError";
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === "QuotaExceededError" || /quota/i.test(e.message))
  );
}

function summarize(r: Resume): ResumeSummary {
  return {
    id: r.id,
    name: r.name,
    updatedAt: r.updatedAt,
    targetType: r.profile.targetType,
    template: r.layout.template,
  };
}

export function createResumeRepository(store: KeyValueStore) {
  async function listResumes(): Promise<ResumeSummary[]> {
    const index = (await store.get<ResumeSummary[]>(INDEX_KEY)) ?? [];
    return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async function loadResume(id: string): Promise<Resume | null> {
    const raw = await store.get<unknown>(resumeKey(id));
    if (!raw) return null;
    const result = migrateResume(raw);
    return result.ok ? result.resume : null;
  }

  async function saveResume(resume: Resume): Promise<void> {
    try {
      await store.set(resumeKey(resume.id), resume);
      const index = (await store.get<ResumeSummary[]>(INDEX_KEY)) ?? [];
      const next = index.filter((s) => s.id !== resume.id);
      next.push(summarize(resume));
      await store.set(INDEX_KEY, next);
    } catch (e) {
      if (isQuotaError(e)) throw new StorageFullError();
      throw e;
    }
  }

  async function deleteResume(id: string): Promise<void> {
    await store.del(resumeKey(id));
    const index = (await store.get<ResumeSummary[]>(INDEX_KEY)) ?? [];
    await store.set(
      INDEX_KEY,
      index.filter((s) => s.id !== id),
    );
  }

  async function duplicateResume(id: string, name?: string): Promise<Resume | null> {
    const original = await loadResume(id);
    if (!original) return null;
    const now = new Date().toISOString();
    const copy: Resume = {
      ...structuredClone(original),
      id: newId(),
      name: (name ?? `${original.name} (copy)`).slice(0, 80),
      createdAt: now,
      updatedAt: now,
    };
    await saveResume(copy);
    return copy;
  }

  async function loadAll(): Promise<Resume[]> {
    const index = await listResumes();
    const all = await Promise.all(index.map((s) => loadResume(s.id)));
    return all.filter((r): r is Resume => r !== null);
  }

  return { listResumes, loadResume, saveResume, deleteResume, duplicateResume, loadAll };
}

export type ResumeRepository = ReturnType<typeof createResumeRepository>;

export function getActiveResumeId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveResumeId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // ignore — active id is a convenience only
  }
}
