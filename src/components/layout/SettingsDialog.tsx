"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useSettings } from "@/hooks/useSettings";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, update] = useSettings();
  const [keyDraft, setKeyDraft] = useState(settings.geminiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  function saveKey() {
    update({ geminiKey: keyDraft.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function removeKey() {
    setKeyDraft("");
    update({ geminiKey: "" });
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <section aria-labelledby="theme-heading">
          <h3 id="theme-heading" className="font-semibold mb-2">
            Appearance
          </h3>
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={settings.theme === t}
                className={`btn btn-sm ${settings.theme === t ? "btn-primary" : "btn-secondary"}`}
                onClick={() => update({ theme: t })}
              >
                {t === "light" ? "☀️ Light" : "🌙 Dark"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">The resume preview always stays white paper.</p>
        </section>

        <section aria-labelledby="byok-heading">
          <h3 id="byok-heading" className="font-semibold mb-1">
            Your own Gemini key (optional)
          </h3>
          <p className="text-sm text-muted mb-3">
            If the shared free AI limit runs out, paste your own free key from{" "}
            <a
              className="text-primary underline"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Google AI Studio
            </a>
            . It is stored only in this browser and sent with each AI request. It is never saved or
            logged on our server.
          </p>
          <label htmlFor="byok" className="label">
            Gemini API key
          </label>
          <div className="flex gap-2">
            <input
              id="byok"
              className="input font-mono"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Paste your key here"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowKey((s) => !s)}
              aria-pressed={showKey}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveKey}>
              Save key
            </button>
            {settings.geminiKey && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={removeKey}>
                Remove key
              </button>
            )}
            <span role="status" aria-live="polite" className="text-sm text-success">
              {saved ? "✓ Saved" : settings.geminiKey ? "Using your key" : ""}
            </span>
          </div>
        </section>

        <section aria-labelledby="privacy-heading">
          <h3 id="privacy-heading" className="font-semibold mb-1">
            Privacy
          </h3>
          <p className="text-sm text-muted">
            Your resumes are saved only in this browser. Before any AI request we remove your phone
            number, email and address.
          </p>
          {settings.aiNoticeAccepted && (
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-2"
              onClick={() => update({ aiNoticeAccepted: false })}
            >
              Show the AI privacy notice again
            </button>
          )}
        </section>
      </div>
    </Modal>
  );
}
