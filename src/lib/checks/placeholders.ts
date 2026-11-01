import { itemLabel } from "@/config/section-fields";
import { LIST_SECTIONS, type ListSectionId, type Resume } from "@/lib/resume/schema";
import { DEFAULT_HEADINGS } from "@/lib/resume/sections";

/** `[number of students]`-style placeholders the AI inserts for the user to fill. */
export const PLACEHOLDER_RE = /\[[^\]\n]{1,80}\]/g;

export function findPlaceholders(text: string): string[] {
  return text.match(PLACEHOLDER_RE) ?? [];
}

export interface PlaceholderLocation {
  /** Human-readable location, e.g. "Projects › Library Seat Finder". */
  where: string;
  placeholder: string;
  text: string;
  section: ListSectionId | "summary" | "contact" | "profile";
  itemId?: string;
}

/** Every unfilled placeholder in the resume — export is blocked while any remain. */
export function collectPlaceholders(resume: Resume): PlaceholderLocation[] {
  const out: PlaceholderLocation[] = [];
  const scan = (text: unknown, where: string, section: PlaceholderLocation["section"], itemId?: string) => {
    if (typeof text !== "string") return;
    for (const p of findPlaceholders(text)) out.push({ where, placeholder: p, text, section, itemId });
  };
  scan(resume.summary, "Summary", "summary");
  scan(resume.profile.title, "Headline", "profile");
  for (const section of LIST_SECTIONS) {
    if (resume.layout.hidden.includes(section)) continue;
    for (const item of resume[section] as unknown as Record<string, unknown>[]) {
      const where = `${DEFAULT_HEADINGS[section]} › ${itemLabel(section, item)}`;
      for (const value of Object.values(item)) {
        if (Array.isArray(value)) value.forEach((v) => scan(v, where, section, item.id as string));
        else scan(value, where, section, item.id as string);
      }
    }
  }
  return out;
}
