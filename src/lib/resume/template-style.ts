import type { TemplateId } from "@/config/templates";

/**
 * Visual tokens per template, shared by the HTML preview and the PDF renderer
 * so both look the same. Sizes are relative to the base font size (em).
 */
export interface TemplateStyle {
  nameAlign: "left" | "center";
  nameScale: number;
  nameColor: string;
  headingUppercase: boolean;
  headingColor: string;
  headingScale: number;
  /** Rule under section headings. */
  headingRule: "none" | "thin" | "solid";
  ruleColor: string;
  contactSeparator: string;
  twoColumn: boolean;
  sidebarBg: string;
  sidebarText: string;
}

const INK = "#111827";

export function getTemplateStyle(template: TemplateId, accent: string): TemplateStyle {
  switch (template) {
    case "modern":
      return {
        nameAlign: "left",
        nameScale: 2.1,
        nameColor: accent,
        headingUppercase: false,
        headingColor: accent,
        headingScale: 1.2,
        headingRule: "thin",
        ruleColor: "#cbd5e1",
        contactSeparator: "  |  ",
        twoColumn: false,
        sidebarBg: "",
        sidebarText: "",
      };
    case "academic":
      return {
        nameAlign: "center",
        nameScale: 1.9,
        nameColor: INK,
        headingUppercase: true,
        headingColor: INK,
        headingScale: 1.05,
        headingRule: "solid",
        ruleColor: INK,
        contactSeparator: "  •  ",
        twoColumn: false,
        sidebarBg: "",
        sidebarText: "",
      };
    case "creative":
      return {
        nameAlign: "left",
        nameScale: 2.2,
        nameColor: accent,
        headingUppercase: true,
        headingColor: accent,
        headingScale: 1.05,
        headingRule: "thin",
        ruleColor: "#e2e8f0",
        contactSeparator: "",
        twoColumn: true,
        sidebarBg: accent,
        sidebarText: "#ffffff",
      };
    default:
      return {
        nameAlign: "center",
        nameScale: 1.9,
        nameColor: INK,
        headingUppercase: true,
        headingColor: INK,
        headingScale: 1.05,
        headingRule: "solid",
        ruleColor: INK,
        contactSeparator: "  |  ",
        twoColumn: false,
        sidebarBg: "",
        sidebarText: "",
      };
  }
}

/** CSS font stacks for the preview (next/font variables set in the root layout). */
export const PREVIEW_FONT_STACKS: Record<string, string> = {
  inter: "var(--font-inter), Arial, sans-serif",
  "source-sans-3": "var(--font-source-sans-3), Arial, sans-serif",
  lato: "var(--font-lato), Arial, sans-serif",
  merriweather: "var(--font-merriweather), Georgia, serif",
  "eb-garamond": "var(--font-eb-garamond), Georgia, serif",
};
