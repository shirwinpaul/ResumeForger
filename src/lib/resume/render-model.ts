/**
 * The ONE shared rendering model. The live preview, PDF, DOCX and plain-text
 * exports all render from `buildRenderDoc()` so they never drift apart.
 */
import { TEMPLATES, type DateFormatId, type TemplateId } from "@/config/templates";
import type { Resume, ResumeLayout, SectionId } from "./schema";
import { headingFor, visibleSections } from "./sections";

export interface RenderEntry {
  /** Bold first line, e.g. a role, degree or project name. */
  title: string;
  /** Second part of the first line, e.g. organisation or institution. */
  subtitle: string;
  /** Right-aligned on the first line (dates). */
  date: string;
  /** Small secondary line (location, tech stack, score, link). */
  meta: string;
  /** Free paragraph text (summary, descriptions). */
  text: string;
  bullets: string[];
}

export interface RenderSection {
  id: SectionId;
  heading: string;
  /** Creative template renders some sections in its sidebar. */
  column: "main" | "side";
  entries: RenderEntry[];
}

export interface ContactItem {
  kind: "email" | "phone" | "location" | "linkedin" | "github" | "portfolio";
  text: string;
  href?: string;
}

export interface RenderDoc {
  template: TemplateId;
  layout: ResumeLayout;
  name: string;
  headline: string;
  contacts: ContactItem[];
  photo: string;
  sections: RenderSection[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Formats a stored "YYYY-MM" / "YYYY" date. */
export function formatDate(value: string, format: DateFormatId): string {
  if (!value) return "";
  const [year, month] = value.split("-");
  if (!month || format === "YYYY") return year;
  const m = Number(month);
  switch (format) {
    case "MM/YYYY":
      return `${month}/${year}`;
    case "MMMM YYYY":
      return `${MONTHS_LONG[m - 1]} ${year}`;
    default:
      return `${MONTHS[m - 1]} ${year}`;
  }
}

export function formatRange(
  r: { start: string; end: string; current: boolean },
  format: DateFormatId,
): string {
  const start = formatDate(r.start, format);
  const end = r.current ? "Present" : formatDate(r.end, format);
  if (start && end) return start === end ? start : `${start} – ${end}`;
  return start || end;
}

const clean = (s: string) => s.trim();
const nonEmpty = (list: string[]) => list.map(clean).filter(Boolean);
const joinParts = (parts: string[], sep = " · ") => nonEmpty(parts).join(sep);

function entry(partial: Partial<RenderEntry>): RenderEntry {
  return { title: "", subtitle: "", date: "", meta: "", text: "", bullets: [], ...partial };
}

/** Adds https:// to bare links so PDFs/DOCX get clickable URLs. */
export function toHref(url: string): string | undefined {
  const u = url.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(u)) return `https://${u}`;
  return undefined;
}

function buildContacts(resume: Resume): ContactItem[] {
  const c = resume.contact;
  const items: ContactItem[] = [];
  const location = joinParts([c.city, c.state, c.country], ", ");
  if (c.email.trim()) items.push({ kind: "email", text: c.email.trim(), href: `mailto:${c.email.trim()}` });
  if (c.phone.trim()) items.push({ kind: "phone", text: c.phone.trim(), href: `tel:${c.phone.replace(/[^\d+]/g, "")}` });
  if (location) items.push({ kind: "location", text: location });
  if (c.linkedin.trim()) items.push({ kind: "linkedin", text: c.linkedin.trim(), href: toHref(c.linkedin) });
  if (c.github.trim()) items.push({ kind: "github", text: c.github.trim(), href: toHref(c.github) });
  if (c.portfolio.trim()) items.push({ kind: "portfolio", text: c.portfolio.trim(), href: toHref(c.portfolio) });
  return items;
}

function sectionEntries(resume: Resume, id: SectionId): RenderEntry[] {
  const fmt = resume.layout.dateFormat;
  switch (id) {
    case "summary":
      return [entry({ text: clean(resume.summary) })];
    case "education":
      return resume.education.map((e) =>
        entry({
          title: joinParts([e.degree, e.major], ", ") || e.institution,
          subtitle: e.degree || e.major ? joinParts([e.institution, e.board], ", ") : clean(e.board),
          date: formatRange(e, fmt),
          meta: joinParts([e.location, e.score ? (e.scoreType === "%" ? `${e.score}%` : `${e.scoreType}: ${e.score}`) : ""]),
          bullets: nonEmpty(e.highlights),
        }),
      );
    case "experience":
    case "leadership":
    case "volunteering":
      return resume[id].map((r) =>
        entry({
          title: clean(r.title),
          subtitle: clean(r.organization),
          date: formatRange(r, fmt),
          meta: clean(r.location),
          bullets: nonEmpty(r.bullets),
        }),
      );
    case "projects":
      return resume.projects.map((p) =>
        entry({
          title: clean(p.name),
          subtitle: clean(p.role),
          date: formatRange(p, fmt),
          meta: joinParts([nonEmpty(p.tech).join(", "), p.link]),
          bullets: nonEmpty(p.bullets),
        }),
      );
    case "achievements":
      return resume.achievements.map((a) =>
        entry({
          title: clean(a.title),
          subtitle: joinParts([a.issuer, a.level ? `${a.level[0].toUpperCase()}${a.level.slice(1)} level` : ""], ", "),
          date: formatDate(a.date, fmt),
          text: clean(a.description),
        }),
      );
    case "certifications":
      return resume.certifications.map((c) =>
        entry({ title: clean(c.name), subtitle: clean(c.issuer), date: formatDate(c.date, fmt), meta: clean(c.link) }),
      );
    case "activities":
      return resume.activities.map((a) =>
        entry({
          title: clean(a.position) ? joinParts([a.position, a.name], ", ") : clean(a.name),
          subtitle: clean(a.organization),
          date: formatRange(a, fmt),
          text: clean(a.description),
          bullets: nonEmpty(a.bullets),
        }),
      );
    case "publications":
      return resume.publications.map((p) =>
        entry({
          title: clean(p.title),
          subtitle: clean(p.venue),
          date: formatDate(p.date, fmt),
          meta: joinParts([p.authors, p.link]),
        }),
      );
    case "skills": {
      const s = resume.skills;
      const groups: [string, string[]][] = [
        ["Technical", s.technical],
        ["Tools", s.tools],
        ["Languages", s.languages],
        ["Soft skills", s.soft],
      ];
      return groups
        .filter(([, list]) => nonEmpty(list).length > 0)
        .map(([label, list]) => entry({ title: label, text: nonEmpty(list).join(", ") }));
    }
    case "hobbies":
      return [entry({ text: nonEmpty(resume.hobbies).join(", ") })];
    case "references":
      if (resume.references.mode === "on-request") return [entry({ text: "Available on request" })];
      return resume.references.entries.map((r) =>
        entry({ title: clean(r.name), subtitle: clean(r.relation), meta: clean(r.contact) }),
      );
  }
}

const SIDEBAR_SECTIONS: SectionId[] = ["skills", "certifications", "hobbies", "references"];

export function buildRenderDoc(resume: Resume): RenderDoc {
  const template = resume.layout.template;
  const sections = visibleSections(resume)
    .map<RenderSection>((id) => ({
      id,
      heading: headingFor(resume, id),
      column: template === "creative" && SIDEBAR_SECTIONS.includes(id) ? "side" : "main",
      entries: sectionEntries(resume, id),
    }))
    .filter((s) => s.entries.length > 0);
  return {
    template,
    layout: resume.layout,
    name: clean(resume.contact.fullName) || "Your Name",
    headline: clean(resume.profile.title),
    contacts: buildContacts(resume),
    photo: TEMPLATES[template].supportsPhoto ? resume.contact.photo : "",
    sections,
  };
}

/** Suggested export file name: Firstname_Lastname_Resume.pdf */
export function suggestFileName(resume: Resume, ext: "pdf" | "docx" | "txt" | "json"): string {
  const parts = resume.contact.fullName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1));
  const base = parts.length ? `${parts.join("_")}_Resume` : "Resume";
  return `${base}.${ext}`;
}
