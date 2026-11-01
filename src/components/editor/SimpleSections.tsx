"use client";

import { useState } from "react";
import { COUNTRIES, getCountry } from "@/config/countries";
import { TEMPLATES } from "@/config/templates";
import { QUALITY_LIMITS } from "@/config/limits";
import { useResumeStore } from "@/hooks/useResumeStore";
import { newId, TARGET_TYPES, type Resume, type Skills } from "@/lib/resume/schema";
import { SelectField, TagsField, TextField } from "./fields";

/** Resize a chosen photo to a small JPEG data URL (stays in the browser). */
async function compressPhoto(file: File, maxPx = 400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't read that image."));
      el.src = url;
    });
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfileEditor({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField label="Version name" value={resume.name} help="e.g. “Oxford CS” or “Internship – Web Dev”" onChange={(v) => update((d) => void (d.name = v.slice(0, 80) || "Untitled"), "name")} />
      <TextField label="Headline (optional)" value={resume.profile.title} placeholder="e.g. Computer Science Student" onChange={(v) => update((d) => void (d.profile.title = v), "profile.title")} />
      <SelectField label="What is this resume for?" value={resume.profile.targetType} options={TARGET_TYPES.map((t) => ({ value: t, label: t }))} onChange={(v) => update((d) => void (d.profile.targetType = v as Resume["profile"]["targetType"]))} />
      <SelectField
        label="Target country"
        value={resume.profile.country}
        options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
        onChange={(v) =>
          update((d) => {
            d.profile.country = v;
            d.layout.pageSize = getCountry(v).paper;
          })
        }
      />
    </div>
  );
}

export function ContactEditor({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const [photoError, setPhotoError] = useState("");
  const c = resume.contact;
  const set = (key: keyof Resume["contact"]) => (v: string) => update((d) => void (d.contact[key] = v), `contact.${key}`);
  const photoAllowed = TEMPLATES[resume.layout.template].supportsPhoto;
  const country = getCountry(resume.profile.country);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextField label="Full name" value={c.fullName} onChange={set("fullName")} autoComplete="name" />
      </div>
      <TextField label="Email" type="email" value={c.email} onChange={set("email")} autoComplete="email" />
      <TextField label="Phone" type="tel" value={c.phone} onChange={set("phone")} autoComplete="tel" />
      <TextField label="City" value={c.city} onChange={set("city")} />
      <TextField label="State / region" value={c.state} onChange={set("state")} />
      <TextField label="Country" value={c.country} onChange={set("country")} />
      <TextField label="LinkedIn (optional)" value={c.linkedin} placeholder="linkedin.com/in/your-name" onChange={set("linkedin")} />
      <TextField label="GitHub (optional)" value={c.github} placeholder="github.com/your-name" onChange={set("github")} />
      <TextField label="Portfolio (optional)" value={c.portfolio} placeholder="yourname.dev" onChange={set("portfolio")} />
      <div className="sm:col-span-2 rounded-lg border border-dashed border-border p-3">
        <p className="label">Photo (optional)</p>
        <p className="text-xs text-muted mb-2">
          Only the Creative template shows a photo. {country.photo === "discouraged" ? `In ${country.name}, photos are usually left out.` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {c.photo && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={c.photo} alt="Your photo" className="h-14 w-14 rounded-full object-cover" />
          )}
          <label className="btn btn-secondary btn-sm">
            {c.photo ? "Change photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const data = await compressPhoto(file);
                  setPhotoError("");
                  update((d) => void (d.contact.photo = data));
                } catch (err) {
                  setPhotoError(err instanceof Error ? err.message : "Couldn't use that image.");
                }
              }}
            />
          </label>
          {c.photo && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => update((d) => void (d.contact.photo = ""))}>
              Remove
            </button>
          )}
          {!photoAllowed && c.photo && <span className="text-xs text-muted">Hidden in this template</span>}
        </div>
        {photoError && <p className="mt-2 text-sm text-danger" role="alert">{photoError}</p>}
      </div>
    </div>
  );
}

export function SummaryEditor({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const len = resume.summary.length;
  return (
    <div>
      <TextField
        multiline
        rows={4}
        label="Summary (2–3 lines)"
        value={resume.summary}
        placeholder="Who you are, what you're good at, and what you're looking for."
        onChange={(v) => update((d) => void (d.summary = v), "summary")}
      />
      <p className={`mt-1 text-xs ${len > QUALITY_LIMITS.maxSummaryChars ? "text-warning" : "text-muted"}`}>
        {len} / {QUALITY_LIMITS.maxSummaryChars} characters recommended
      </p>
    </div>
  );
}

const SKILL_GROUPS: { key: keyof Skills; label: string; placeholder: string }[] = [
  { key: "technical", label: "Technical skills", placeholder: "e.g. Python, Data analysis" },
  { key: "tools", label: "Tools & software", placeholder: "e.g. Git, Excel, Canva" },
  { key: "languages", label: "Languages spoken", placeholder: "e.g. English, Hindi" },
  { key: "soft", label: "Soft skills", placeholder: "e.g. Teamwork, Public speaking" },
];

export function SkillsEditor({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  return (
    <div className="space-y-3">
      {SKILL_GROUPS.map((g) => (
        <TagsField key={g.key} label={g.label} placeholder={g.placeholder} values={resume.skills[g.key]} onChange={(v) => update((d) => void (d.skills[g.key] = v))} />
      ))}
    </div>
  );
}

export function HobbiesEditor({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  return <TagsField label="Interests & hobbies" placeholder="e.g. Chess, Photography" values={resume.hobbies} onChange={(v) => update((d) => void (d.hobbies = v))} />;
}

export function ReferencesEditor({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const refs = resume.references;
  return (
    <div className="space-y-3">
      <SelectField
        label="References"
        value={refs.mode}
        options={[
          { value: "hidden", label: "Don't show" },
          { value: "on-request", label: "“Available on request”" },
          { value: "list", label: "List referees" },
        ]}
        onChange={(v) => update((d) => void (d.references.mode = v as typeof refs.mode))}
      />
      {refs.mode === "list" && (
        <div className="space-y-3">
          {refs.entries.map((r, i) => (
            <div key={r.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
              <TextField label="Name" value={r.name} onChange={(v) => update((d) => void (d.references.entries[i].name = v), `ref.${r.id}.name`)} />
              <TextField label="Relation" value={r.relation} placeholder="e.g. Class teacher" onChange={(v) => update((d) => void (d.references.entries[i].relation = v), `ref.${r.id}.rel`)} />
              <TextField label="Contact" value={r.contact} onChange={(v) => update((d) => void (d.references.entries[i].contact = v), `ref.${r.id}.contact`)} />
              <button type="button" className="btn btn-ghost btn-sm text-danger sm:col-span-3 justify-self-start" onClick={() => update((d) => void d.references.entries.splice(i, 1))}>
                Remove referee
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => update((d) => void d.references.entries.push({ id: newId(), name: "", relation: "", contact: "" }))}
          >
            + Add referee
          </button>
          <p className="text-xs text-muted">Ask your referees for permission before listing their contact details.</p>
        </div>
      )}
    </div>
  );
}
