"use client";

import {
  ACCENT_COLORS,
  DATE_FORMATS,
  NON_ATS_WARNING,
  RESUME_FONTS,
  TEMPLATES,
  TEMPLATE_IDS,
  type TemplateId,
} from "@/config/templates";
import { LAYOUT_LIMITS } from "@/config/limits";
import { useResumeStore } from "@/hooks/useResumeStore";
import type { Resume, SectionId } from "@/lib/resume/schema";
import { normalizeLayout } from "@/lib/resume/schema";

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="label flex justify-between">
        <span>{label}</span>
        <span className="font-mono">
          {value}
          {unit}
        </span>
      </label>
      <input
        id={id}
        type="range"
        className="w-full accent-[var(--primary)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Template picker + customisation (accent, font, size, margins, date format, paper). */
export function DesignPanel({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const L = resume.layout;

  function setTemplate(id: TemplateId) {
    update((d) => {
      d.layout.template = id;
      const order = TEMPLATES[id].preferredOrder;
      if (order) d.layout.sectionOrder = normalizeLayout({ ...d, layout: { ...d.layout, sectionOrder: order as SectionId[] } }).layout.sectionOrder;
    });
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="label">Template</legend>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_IDS.map((id) => {
            const t = TEMPLATES[id];
            const active = L.template === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setTemplate(id)}
                className={`rounded-lg border p-2.5 text-left text-sm transition ${
                  active ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"
                }`}
              >
                <span className="block font-semibold">{t.name}</span>
                <span className={`block text-xs ${t.atsFriendly ? "text-success" : "text-warning"}`}>
                  {t.atsFriendly ? "ATS-friendly" : "Not ATS-friendly"}
                </span>
              </button>
            );
          })}
        </div>
        {!TEMPLATES[L.template].atsFriendly && (
          <p className="mt-2 rounded-lg bg-warning-soft p-2 text-sm text-warning" role="note">
            ⚠️ {NON_ATS_WARNING}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">Accent colour</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-label={c.name}
              aria-pressed={L.accent === c.value}
              onClick={() => update((d) => void (d.layout.accent = c.value))}
              className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-surface ${L.accent === c.value ? "ring-2 ring-primary" : ""}`}
              style={{ background: c.value }}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="font" className="label">
            Font
          </label>
          <select
            id="font"
            className="input"
            value={L.font}
            onChange={(e) => update((d) => void (d.layout.font = e.target.value))}
          >
            {RESUME_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.kind})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date-format" className="label">
            Date format
          </label>
          <select
            id="date-format"
            className="input"
            value={L.dateFormat}
            onChange={(e) => update((d) => void (d.layout.dateFormat = e.target.value as typeof L.dateFormat))}
          >
            {DATE_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.example}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="paper" className="label">
            Paper size
          </label>
          <select
            id="paper"
            className="input"
            value={L.pageSize}
            onChange={(e) => update((d) => void (d.layout.pageSize = e.target.value as "A4" | "Letter"))}
          >
            <option value="A4">A4</option>
            <option value="Letter">US Letter</option>
          </select>
        </div>
      </div>

      <Slider
        id="font-size"
        label="Font size"
        unit="pt"
        value={L.fontSizePt}
        min={LAYOUT_LIMITS.fontSizePt.min}
        max={LAYOUT_LIMITS.fontSizePt.max}
        step={0.5}
        onChange={(v) => update((d) => void (d.layout.fontSizePt = v), "font-size")}
      />
      <Slider
        id="margins"
        label="Margins"
        unit="mm"
        value={L.marginMm}
        min={LAYOUT_LIMITS.marginMm.min}
        max={LAYOUT_LIMITS.marginMm.max}
        step={1}
        onChange={(v) => update((d) => void (d.layout.marginMm = v), "margins")}
      />
      <Slider
        id="line-height"
        label="Line spacing"
        unit=""
        value={L.lineHeight}
        min={LAYOUT_LIMITS.lineHeight.min}
        max={LAYOUT_LIMITS.lineHeight.max}
        step={0.05}
        onChange={(v) => update((d) => void (d.layout.lineHeight = v), "line-height")}
      />
      <Slider
        id="section-gap"
        label="Space between sections"
        unit="pt"
        value={L.sectionGapPt}
        min={LAYOUT_LIMITS.sectionGapPt.min}
        max={LAYOUT_LIMITS.sectionGapPt.max}
        step={1}
        onChange={(v) => update((d) => void (d.layout.sectionGapPt = v), "section-gap")}
      />
    </div>
  );
}
