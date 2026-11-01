/** Resume templates and customisation options. Shared by preview, PDF and DOCX. */

export const TEMPLATE_IDS = ["classic", "modern", "academic", "creative"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  atsFriendly: boolean;
  supportsPhoto: boolean;
  /** Section order applied when a user switches to this template (optional). */
  preferredOrder?: string[];
}

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  classic: {
    id: "classic",
    name: "Classic ATS",
    description: "Single column, standard headings, maximum ATS safety.",
    atsFriendly: true,
    supportsPhoto: false,
  },
  modern: {
    id: "modern",
    name: "Modern Clean",
    description: "Single column with accent-coloured headings and thin dividers. Still ATS-safe.",
    atsFriendly: true,
    supportsPhoto: false,
  },
  academic: {
    id: "academic",
    name: "Academic / University",
    description:
      "Education first, then achievements, research and activities — for university and scholarship applications.",
    atsFriendly: true,
    supportsPhoto: false,
    preferredOrder: [
      "summary",
      "education",
      "achievements",
      "publications",
      "projects",
      "activities",
      "leadership",
      "volunteering",
      "experience",
      "certifications",
      "skills",
      "hobbies",
      "references",
    ],
  },
  creative: {
    id: "creative",
    name: "Creative (non-ATS)",
    description: "Two columns with an accent sidebar and optional photo.",
    atsFriendly: false,
    supportsPhoto: true,
  },
};

export const NON_ATS_WARNING = "Not ATS-friendly — use for portfolios or direct emails";

/** Curated accent colours — all at least 4.5:1 contrast on white. */
export const ACCENT_COLORS = [
  { name: "Indigo", value: "#3730a3" },
  { name: "Navy", value: "#1e3a8a" },
  { name: "Teal", value: "#115e59" },
  { name: "Forest", value: "#166534" },
  { name: "Burgundy", value: "#9f1239" },
  { name: "Charcoal", value: "#334155" },
] as const;

export const RESUME_FONTS = [
  { id: "inter", name: "Inter", family: "Inter", kind: "sans" },
  { id: "source-sans-3", name: "Source Sans 3", family: "Source Sans 3", kind: "sans" },
  { id: "lato", name: "Lato", family: "Lato", kind: "sans" },
  { id: "merriweather", name: "Merriweather", family: "Merriweather", kind: "serif" },
  { id: "eb-garamond", name: "EB Garamond", family: "EB Garamond", kind: "serif" },
] as const;

export type ResumeFontId = (typeof RESUME_FONTS)[number]["id"];

export function getFont(id: string) {
  return RESUME_FONTS.find((f) => f.id === id) ?? RESUME_FONTS[0];
}

/** Page sizes in millimetres. */
export const PAGE_SIZES = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
} as const;
export type PageSize = keyof typeof PAGE_SIZES;

export const DATE_FORMATS = [
  { id: "MMM YYYY", example: "Jun 2025" },
  { id: "MM/YYYY", example: "06/2025" },
  { id: "YYYY", example: "2025" },
  { id: "MMMM YYYY", example: "June 2025" },
] as const;
export type DateFormatId = (typeof DATE_FORMATS)[number]["id"];
