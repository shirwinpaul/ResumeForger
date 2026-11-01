"use client";

import { useRef, useState } from "react";
import { useResumeStore } from "@/hooks/useResumeStore";
import { exportJson } from "@/lib/export/download";
import { parseBackup } from "@/lib/export/json";

/** JSON backup of ALL resumes (export) and restore from a backup file (import). */
export function BackupControls({ onImported }: { onImported: () => void }) {
  const { getRepository } = useResumeStore();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function backup() {
    const all = await (await getRepository()).loadAll();
    if (!all.length) return setStatus({ ok: false, text: "No resumes to back up yet." });
    exportJson(all, `ResumeForge_backup_${new Date().toISOString().slice(0, 10)}`);
    setStatus({ ok: true, text: `✓ Backed up ${all.length} resume${all.length === 1 ? "" : "s"}.` });
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setStatus({ ok: false, text: "That file is too large to be a ResumeForge backup." });
    const repo = await getRepository();
    const existing = (await repo.listResumes()).map((s) => s.id);
    const { resumes, errors } = parseBackup(await file.text(), existing);
    try {
      for (const r of resumes) await repo.saveResume(r);
    } catch {
      return setStatus({ ok: false, text: "Your browser storage is full — delete an old version and try again." });
    }
    onImported();
    const parts = [resumes.length ? `✓ Restored ${resumes.length} resume${resumes.length === 1 ? "" : "s"}.` : "", errors.length ? `${errors.length} couldn't be read.` : ""];
    setStatus({ ok: resumes.length > 0, text: parts.filter(Boolean).join(" ") || "Nothing found in that file." });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-ghost btn-sm" onClick={backup}>
        💾 Back up all (JSON)
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}>
        📂 Restore backup
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Choose a ResumeForge backup file"
        tabIndex={-1}
        onChange={(e) => {
          void restore(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {status && (
        <span role="status" className={`basis-full text-xs ${status.ok ? "text-success" : "text-danger"}`}>
          {status.text}
        </span>
      )}
    </div>
  );
}
