"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { COUNTRIES, getCountry } from "@/config/countries";
import { TEMPLATES, TEMPLATE_IDS, type TemplateId } from "@/config/templates";
import { getSampleResume } from "@/data/sample-resume";
import { useResumeStore } from "@/hooks/useResumeStore";
import { createEmptyResume, newId, TARGET_TYPES, type TargetType } from "@/lib/resume/schema";
import type { ResumeSummary } from "@/lib/resume/storage";
import { SelectField } from "@/components/editor/fields";
import { BackupControls } from "./BackupControls";

export function StartScreen({ mode }: { mode?: string }) {
  const router = useRouter();
  const { open, getRepository, resume: active } = useResumeStore();
  const [list, setList] = useState<ResumeSummary[] | null>(null);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<TargetType>("Internship");
  const [country, setCountry] = useState("IN");
  const [template, setTemplate] = useState<TemplateId>("classic");

  const refresh = useCallback(async () => {
    try {
      setList(await (await getRepository()).listResumes());
    } catch {
      setError("Couldn't read saved resumes from this browser.");
      setList([]);
    }
  }, [getRepository]);

  useEffect(() => {
    // Initial load from browser storage (an external system).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function startFresh() {
    const r = createEmptyResume(`${target} resume`);
    r.profile.targetType = target;
    r.profile.country = country;
    r.layout.template = template;
    r.layout.pageSize = getCountry(country).paper;
    await open(r);
    router.push("/builder");
  }

  async function trySample() {
    const r = getSampleResume();
    const now = new Date().toISOString();
    await open({ ...r, id: newId(), createdAt: now, updatedAt: now, layout: { ...r.layout, template } });
    router.push("/editor");
  }

  async function openExisting(id: string) {
    const r = await (await getRepository()).loadResume(id);
    if (!r) {
      setError("That version couldn't be opened — it may be damaged.");
      return;
    }
    await open(r);
    router.push("/editor");
  }

  async function duplicate(s: ResumeSummary) {
    const name = window.prompt("Name for the copy (e.g. “Oxford CS” or “Internship – Web Dev”):", `${s.name} (copy)`);
    if (name === null) return;
    const copy = await (await getRepository()).duplicateResume(s.id, name.trim() || `${s.name} (copy)`);
    if (copy) await refresh();
  }

  async function remove(s: ResumeSummary) {
    if (!window.confirm(`Delete “${s.name}” permanently from this browser? This can't be undone.`)) return;
    await (await getRepository()).deleteResume(s.id);
    await refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-extrabold">Let&apos;s forge your resume</h1>
      <p className="mt-1 text-muted">Everything is saved in this browser only.</p>

      <section aria-labelledby="new-heading" className={`card mt-6 p-5 ${mode === "guided" ? "ring-2 ring-primary" : ""}`}>
        <h2 id="new-heading" className="text-lg font-bold">
          Start something new
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SelectField label="What is it for?" value={target} options={TARGET_TYPES.map((t) => ({ value: t, label: t }))} onChange={(v) => setTarget(v as TargetType)} />
          <SelectField label="Target country" value={country} options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} onChange={setCountry} />
          <SelectField
            label="Template (change anytime)"
            value={template}
            options={TEMPLATE_IDS.map((t) => ({ value: t, label: TEMPLATES[t].name }))}
            onChange={(v) => setTemplate(v as TemplateId)}
          />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button type="button" className="btn btn-primary py-3" onClick={startFresh}>
            ✨ Start fresh (guided)
          </button>
          <Link href="/import" className={`btn btn-secondary py-3 ${mode === "import" ? "ring-2 ring-primary" : ""}`}>
            📥 Import my resume
          </Link>
          <button type="button" className="btn btn-secondary py-3" onClick={trySample}>
            🧪 Try with sample data
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Sample data is a fictional student (Priya Sharma) so you can explore safely.</p>
      </section>

      <section aria-labelledby="versions-heading" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="versions-heading" className="text-lg font-bold">
            Your resume versions
          </h2>
          <BackupControls onImported={refresh} />
        </div>
        {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
        {list === null ? (
          <p className="mt-3 text-muted" role="status">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-3 text-muted">No saved versions yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {list.map((s) => (
              <li key={s.id} className={`card p-4 ${active?.id === s.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted">
                      {s.targetType} · {TEMPLATES[s.template as TemplateId]?.name ?? s.template} · edited{" "}
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {active?.id === s.id && <span className="text-xs font-semibold text-primary">Open</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openExisting(s.id)}>
                    Open
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicate(s)}>
                    📋 Duplicate
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => remove(s)} aria-label={`Delete ${s.name}`}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
