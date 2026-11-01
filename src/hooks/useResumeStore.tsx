"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createHistory, pushHistory, redo, undo, type History } from "@/lib/resume/history";
import type { Resume } from "@/lib/resume/schema";
import {
  createResumeRepository,
  getActiveResumeId,
  getBrowserStore,
  setActiveResumeId,
  StorageFullError,
  type ResumeRepository,
} from "@/lib/resume/storage";

type SaveState = "idle" | "saving" | "saved" | "error";

type Action =
  | { type: "load"; resume: Resume | null }
  | { type: "update"; resume: Resume; coalesceKey?: string }
  | { type: "undo" }
  | { type: "redo" };

interface State {
  loaded: boolean;
  history: History<Resume | null>;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      return { loaded: true, history: createHistory<Resume | null>(action.resume) };
    case "update":
      return {
        ...state,
        history: pushHistory<Resume | null>(state.history, action.resume, {
          coalesceKey: action.coalesceKey,
        }),
      };
    case "undo":
      return { ...state, history: undo(state.history) };
    case "redo":
      return { ...state, history: redo(state.history) };
  }
}

interface ResumeStore {
  loaded: boolean;
  resume: Resume | null;
  saveState: SaveState;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  /** Apply an edit. `recipe` mutates a fresh copy; edits with the same key coalesce into one undo step. */
  update: (recipe: (draft: Resume) => void, coalesceKey?: string) => void;
  /** Open (and save) a resume as the active one, clearing undo history. */
  open: (resume: Resume) => Promise<void>;
  close: () => void;
  undo: () => void;
  redo: () => void;
  getRepository: () => Promise<ResumeRepository>;
}

const ResumeStoreContext = createContext<ResumeStore | null>(null);

const AUTOSAVE_DELAY_MS = 400;

export function ResumeStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    loaded: false,
    history: createHistory<Resume | null>(null),
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const repoRef = useRef<Promise<ResumeRepository> | null>(null);
  const lastSaved = useRef<Resume | null>(null);
  /** Set once the user opens or closes a resume, so the slower first-mount load can't overwrite it. */
  const userChose = useRef(false);
  const present = state.history.present;

  const getRepository = useCallback(() => {
    repoRef.current ??= getBrowserStore().then(createResumeRepository);
    return repoRef.current;
  }, []);

  // Load the last active resume on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = getActiveResumeId();
      const resume = id ? await (await getRepository()).loadResume(id).catch(() => null) : null;
      if (cancelled) return;
      if (userChose.current) {
        // The user already picked a resume (e.g. clicked "Try with sample data" right away) — keep it.
        return;
      }
      lastSaved.current = resume;
      dispatch({ type: "load", resume });
    })();
    return () => {
      cancelled = true;
    };
  }, [getRepository]);

  // Auto-save shortly after every change (including undo/redo).
  useEffect(() => {
    if (!state.loaded || !present || present === lastSaved.current) return;
    const timer = setTimeout(async () => {
      setSaveState("saving");
      try {
        await (await getRepository()).saveResume(present);
        lastSaved.current = present;
        setSaveState("saved");
        setSaveError(null);
      } catch (e) {
        setSaveState("error");
        setSaveError(
          e instanceof StorageFullError ? e.message : "Couldn't save to your browser. Try exporting a backup.",
        );
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [present, state.loaded, getRepository]);

  const presentRef = useRef(present);
  useEffect(() => {
    presentRef.current = present;
  }, [present]);

  const update = useCallback((recipe: (draft: Resume) => void, coalesceKey?: string) => {
    const current = presentRef.current;
    if (!current) return;
    const draft = structuredClone(current);
    recipe(draft);
    draft.updatedAt = new Date().toISOString();
    presentRef.current = draft;
    dispatch({ type: "update", resume: draft, coalesceKey });
  }, []);

  const open = useCallback(
    async (resume: Resume) => {
      userChose.current = true;
      setActiveResumeId(resume.id);
      presentRef.current = resume;
      dispatch({ type: "load", resume });
      try {
        await (await getRepository()).saveResume(resume);
        lastSaved.current = resume;
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
        setSaveError(e instanceof StorageFullError ? e.message : "Couldn't save to your browser.");
      }
    },
    [getRepository],
  );

  const close = useCallback(() => {
    userChose.current = true;
    setActiveResumeId(null);
    presentRef.current = null;
    dispatch({ type: "load", resume: null });
  }, []);

  const value = useMemo<ResumeStore>(
    () => ({
      loaded: state.loaded,
      resume: present,
      saveState,
      saveError,
      canUndo: state.history.past.length > 0 && state.history.past.at(-1) !== null,
      canRedo: state.history.future.length > 0,
      update,
      open,
      close,
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      getRepository,
    }),
    [state, present, saveState, saveError, update, open, close, getRepository],
  );

  return <ResumeStoreContext.Provider value={value}>{children}</ResumeStoreContext.Provider>;
}

export function useResumeStore(): ResumeStore {
  const ctx = useContext(ResumeStoreContext);
  if (!ctx) throw new Error("useResumeStore must be used inside ResumeStoreProvider");
  return ctx;
}

/** Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo (desktop). */
export function useUndoShortcuts() {
  const { undo: doUndo, redo: doRedo } = useResumeStore();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        doRedo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo]);
}
