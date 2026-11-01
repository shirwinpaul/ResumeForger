/**
 * Plain-text rendering from the shared render model. Used for the .txt export
 * (with contact details) and as compact, contact-free context for AI calls.
 */
import { buildRenderDoc, type RenderDoc } from "@/lib/resume/render-model";
import type { Resume } from "@/lib/resume/schema";

function sectionsText(doc: RenderDoc, skip: string[] = []): string[] {
  const out: string[] = [];
  for (const s of doc.sections) {
    if (skip.includes(s.id)) continue;
    out.push("", s.heading.toUpperCase());
    for (const e of s.entries) {
      const head = [e.title, e.subtitle].filter(Boolean).join(" — ");
      const first = [head, e.date].filter(Boolean).join(" | ");
      if (first) out.push(first);
      if (e.meta) out.push(e.meta);
      if (e.text) out.push(e.text);
      for (const b of e.bullets) out.push(`• ${b}`);
    }
  }
  return out;
}

/** The full resume as plain text (what the .txt export downloads). */
export function renderPlainText(resume: Resume): string {
  const doc = buildRenderDoc(resume);
  const lines = [doc.name];
  if (doc.headline) lines.push(doc.headline);
  if (doc.contacts.length) lines.push(doc.contacts.map((c) => c.text).join(" | "));
  return [...lines, ...sectionsText(doc)].join("\n").trim() + "\n";
}

/**
 * Resume content for AI context: no name, contacts, photo or references.
 * `skip` leaves out sections the action doesn't need (e.g. the summary being rewritten).
 */
export function resumeContentForAi(resume: Resume, skip: string[] = []): string {
  const doc = buildRenderDoc(resume);
  return sectionsText(doc, ["references", ...skip]).join("\n").trim();
}
