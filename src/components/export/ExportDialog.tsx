"use client";

import { useId, useMemo, useState } from "react";
import { NON_ATS_WARNING, TEMPLATES } from "@/config/templates";
import { collectPlaceholders } from "@/lib/checks/placeholders";
import { exportDocx, exportJson, exportPdf, exportText } from "@/lib/export/download";
import { renderPlainText } from "@/lib/export/text";
import { suggestFileName } from "@/lib/resume/render-model";
import type { Resume } from "@/lib/resume/schema";
import { Modal } from "@/components/ui/Modal";

type Format = "pdf" | "docx" | "txt" | "json";

/** Optional "Review it in AdmitLens" link; hidden when the env var is empty. */
const ADMITLENS_URL = process.env.NEXT_PUBLIC_ADMITLENS_URL ?? "";

export function ExportDialog({ resume, open, onClose }: { resume: Resume; open: boolean; onClose: () => void }) {
  const id = useId();
  const placeholders = useMemo(() => collectPlaceholders(resume), [resume]);
  const [name, setName] = useState(() => suggestFileName(resume, "pdf").replace(/\.pdf$/, ""));
  const [busy, setBusy] = useState<Format | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const blocked = placeholders.length > 0;
  const template = TEMPLATES[resume.layout.template];

  async function run(format: Format) {
    setBusy(format);
    setError("");
    setMessage("");
    try {
      if (format === "pdf") await exportPdf(resume, name);
      else if (format === "docx") await exportDocx(resume, name);
      else if (format === "txt") exportText(resume, name);
      else exportJson([resume], `${name}_backup`);
      setMessage("✓ Downloaded. Check your Downloads folder.");
    } catch {
      setError("Sorry — that export didn't work. Please try again, or try a different format.");
    } finally {
      setBusy(null);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(renderPlainText(resume));
      setMessage("✓ Copied — paste it into the application form.");
    } catch {
      setError("Your browser blocked copying. Use “Plain text (.txt)” instead.");
    }
  }

  const button = (format: Format, label: string, hint: string, needsNoPlaceholders = true) => (
    <button
      type="button"
      className="btn btn-secondary flex-col !items-start !justify-start gap-0.5 py-3 text-left"
      disabled={busy !== null || (needsNoPlaceholders && blocked)}
      aria-busy={busy === format}
      onClick={() => run(format)}
    >
      <span className="font-semibold">{busy === format ? "Preparing…" : label}</span>
      <span className="text-xs font-normal text-muted">{hint}</span>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Export your resume" wide>
      {blocked && (
        <section className="mb-4 rounded-xl border border-warning bg-warning-soft p-4" aria-labelledby={`${id}-ph`}>
          <h3 id={`${id}-ph`} className="font-bold">
            ✏️ Fill these placeholders first ({placeholders.length})
          </h3>
          <p className="mt-1 text-sm">Replace each [bracket] with your real detail — or delete it if you don&apos;t know it. Never guess a number.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {placeholders.map((p, i) => (
              <li key={i} className="flex gap-2">
                <input type="checkbox" disabled aria-label="Not filled yet" />
                <span>
                  <strong>{p.where}:</strong> <mark className="rounded bg-amber-200 px-1 text-amber-950">{p.placeholder}</mark>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">You can still save a JSON backup.</p>
        </section>
      )}

      <label className="label" htmlFor={`${id}-name`}>
        File name
      </label>
      <input id={`${id}-name`} className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <p className="mt-1 text-xs text-muted">Tip: recruiters like “Firstname_Lastname_Resume”.</p>

      {!template.atsFriendly && <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm">⚠️ {NON_ATS_WARNING}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {button("pdf", "📄 PDF", "Best for applying — real, selectable text")}
        {button("docx", "📝 Word (.docx)", resume.layout.template === "creative" ? "Editable; sidebar becomes one column" : "Editable, with real headings and bullets")}
        {button("txt", "🔤 Plain text (.txt)", "For pasting into online forms")}
        {button("json", "💾 JSON backup", "Move to another device or keep a copy", false)}
      </div>
      <div className="mt-2">
        <button type="button" className="btn btn-ghost btn-sm" disabled={blocked} onClick={copyText}>
          📋 Copy as plain text
        </button>
      </div>

      <div aria-live="polite" className="mt-2 min-h-5 text-sm">
        {message && <p className="text-success">{message}</p>}
        {error && (
          <p className="text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      {ADMITLENS_URL && (
        <div className="mt-4 border-t border-border pt-4">
          <a href={ADMITLENS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            🔍 Review it in AdmitLens
          </a>
        </div>
      )}
    </Modal>
  );
}
