"use client";

import { useState, type ReactNode } from "react";
import { isListSection, type Resume, type SectionId } from "@/lib/resume/schema";
import { headingFor } from "@/lib/resume/sections";
import { ListSectionEditor } from "./ListSectionEditor";
import { ContactEditor, HobbiesEditor, ProfileEditor, ReferencesEditor, SkillsEditor, SummaryEditor } from "./SimpleSections";

function Panel({ title, badge, defaultOpen, children, extra }: { title: string; badge?: string; defaultOpen?: boolean; children: ReactNode; extra?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className="card">
      <h3>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left font-semibold hover:bg-surface-2"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span>
            {title}
            {badge && <span className="ml-2 text-xs font-normal text-muted">{badge}</span>}
          </span>
          <span aria-hidden="true" className="text-muted">
            {open ? "▴" : "▾"}
          </span>
        </button>
      </h3>
      {open && (
        <div className="border-t border-border p-4">
          {extra}
          {children}
        </div>
      )}
    </section>
  );
}

function sectionBody(resume: Resume, id: SectionId): ReactNode {
  if (isListSection(id)) return <ListSectionEditor resume={resume} section={id} />;
  switch (id) {
    case "summary":
      return <SummaryEditor resume={resume} />;
    case "skills":
      return <SkillsEditor resume={resume} />;
    case "hobbies":
      return <HobbiesEditor resume={resume} />;
    case "references":
      return <ReferencesEditor resume={resume} />;
  }
}

/**
 * All resume content as collapsible panels, in the resume's section order.
 * `sectionExtras` lets the AI layer add tools (e.g. "Write my summary") to a section.
 */
export function ContentPanel({ resume, sectionExtras }: { resume: Resume; sectionExtras?: Partial<Record<SectionId, ReactNode>> }) {
  return (
    <div className="space-y-3">
      <Panel title="Resume settings" defaultOpen={false}>
        <ProfileEditor resume={resume} />
      </Panel>
      <Panel title="Contact details" defaultOpen={!resume.contact.fullName}>
        <ContactEditor resume={resume} />
      </Panel>
      {resume.layout.sectionOrder.map((id) => (
        <Panel
          key={id}
          title={headingFor(resume, id)}
          badge={resume.layout.hidden.includes(id) ? "(hidden)" : undefined}
          extra={sectionExtras?.[id]}
        >
          {sectionBody(resume, id)}
        </Panel>
      ))}
    </div>
  );
}
