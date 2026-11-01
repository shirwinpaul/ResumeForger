"use client";

import { useResumeStore } from "@/hooks/useResumeStore";
import { moveInArray } from "@/lib/resume/edit";
import type { Resume, SectionId } from "@/lib/resume/schema";
import { DEFAULT_HEADINGS, isStandardHeading, sectionHasContent } from "@/lib/resume/sections";
import { SortableList } from "./SortableList";

/** Reorder sections (drag or keyboard), show/hide them and rename headings. */
export function SectionsManager({ resume }: { resume: Resume }) {
  const { update } = useResumeStore();
  const items = resume.layout.sectionOrder.map((id) => ({ id }));

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Drag to reorder. Standard headings are easiest for applicant tracking systems (ATS) to read.
      </p>
      <SortableList
        items={items}
        label="sections"
        onMove={(from, to) => update((d) => void (d.layout.sectionOrder = moveInArray(d.layout.sectionOrder, from, to)))}
        renderItem={({ id }, handle) => {
          const section = id as SectionId;
          const hidden = resume.layout.hidden.includes(section);
          const heading = resume.layout.headings[section] ?? "";
          const nonStandard = !isStandardHeading(section, heading);
          const empty = !sectionHasContent(resume, section);
          return (
            <div className={`rounded-xl border border-border bg-surface p-2 ${hidden ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2">
                {handle}
                <label className="sr-only" htmlFor={`heading-${section}`}>
                  Heading for {DEFAULT_HEADINGS[section]}
                </label>
                <input
                  id={`heading-${section}`}
                  className="input !py-1 flex-1"
                  value={heading}
                  placeholder={DEFAULT_HEADINGS[section]}
                  onChange={(e) =>
                    update((d) => {
                      d.layout.headings[section] = e.target.value.slice(0, 60);
                    }, `heading.${section}`)
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`${hidden ? "Hidden" : "Shown"}: ${DEFAULT_HEADINGS[section]} (click to ${hidden ? "show" : "hide"})`}
                  title={hidden ? "Click to show this section" : "Click to hide this section"}
                  onClick={() =>
                    update((d) => {
                      d.layout.hidden = hidden ? d.layout.hidden.filter((h) => h !== section) : [...d.layout.hidden, section];
                    })
                  }
                >
                  {hidden ? "🙈 Hidden" : "👁 Shown"}
                </button>
              </div>
              {(nonStandard || empty) && (
                <p className="mt-1 pl-10 text-xs">
                  {nonStandard && (
                    <span className="text-warning">
                      ⚠️ Non-standard heading — ATS may not recognise it. Try “{DEFAULT_HEADINGS[section]}”.{" "}
                    </span>
                  )}
                  {empty && <span className="text-muted">Empty — won&apos;t appear on the resume.</span>}
                </p>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
