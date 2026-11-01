/**
 * App settings stored in localStorage (never sent to the server, except the
 * optional BYOK Gemini key, which is sent per AI request in a header).
 */

export type ThemeMode = "light" | "dark";

export interface AppSettings {
  theme: ThemeMode;
  /** User's own Gemini key (Bring Your Own Key). Empty = use the server's key. */
  geminiKey: string;
  /** User saw and accepted the "resume text is sent to an AI provider" notice. */
  aiNoticeAccepted: boolean;
}

export const SETTINGS_KEY = "resumeforge:settings";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  geminiKey: "",
  aiNoticeAccepted: false,
};

const listeners = new Set<() => void>();
let cached: AppSettings | null = null;

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readSettings(): AppSettings {
  if (cached) return cached;
  const storage = safeStorage();
  let parsed: Partial<AppSettings> = {};
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (raw) parsed = JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    parsed = {};
  }
  cached = {
    theme: parsed.theme === "dark" ? "dark" : "light",
    geminiKey: typeof parsed.geminiKey === "string" ? parsed.geminiKey : "",
    aiNoticeAccepted: parsed.aiNoticeAccepted === true,
  };
  return cached;
}

export function writeSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...readSettings(), ...patch };
  cached = next;
  try {
    safeStorage()?.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked — settings still apply for this session.
  }
  applyTheme(next.theme);
  listeners.forEach((l) => l());
  return next;
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Inline script run before paint so the saved theme never flashes. */
export const THEME_INIT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");if(s.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
