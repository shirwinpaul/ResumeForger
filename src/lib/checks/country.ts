import { COUNTRY_GUIDANCE_LABEL, getCountry } from "@/config/countries";
import { TEMPLATES } from "@/config/templates";
import type { Resume } from "@/lib/resume/schema";

export interface CountryAdvice {
  country: string;
  label: string;
  tips: string[];
  /** Tips triggered by this resume's content. */
  warnings: string[];
}

/** General country guidance plus warnings that apply to this resume. */
export function countryAdvice(resume: Resume, pages?: number): CountryAdvice {
  const c = getCountry(resume.profile.country);
  const warnings: string[] = [];
  const showsPhoto = Boolean(resume.contact.photo) && TEMPLATES[resume.layout.template].supportsPhoto;
  if (showsPhoto && c.photo === "discouraged") warnings.push(`Photos are usually left out in ${c.name} — remove it or use an ATS template.`);
  if (pages !== undefined && pages > c.studentPages) warnings.push(`${pages} pages — ${c.studentPages} page${c.studentPages > 1 ? "s" : ""} is typical for students in ${c.name}.`);
  if (c.paper !== resume.layout.pageSize) warnings.push(`${c.name} usually uses ${c.paper === "Letter" ? "US Letter" : "A4"} paper (change it in Design).`);
  if (c.code === "IN") {
    const school = resume.education.filter((e) => /class|grade|std|hsc|ssc|12|10/i.test(e.degree));
    if (school.some((e) => !e.board.trim())) warnings.push("Add your board (CBSE / ICSE / State Board) to school entries.");
    if (resume.education.some((e) => !e.score.trim())) warnings.push("Include your percentage or CGPA for each education entry.");
  }
  return { country: c.name, label: COUNTRY_GUIDANCE_LABEL, tips: c.tips, warnings };
}
