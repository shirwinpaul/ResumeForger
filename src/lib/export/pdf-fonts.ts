/**
 * Font registration for PDF export. The same families as the live preview, from
 * @fontsource WOFF files (copied to /public/fonts by scripts/copy-assets.mjs).
 * Each font has a "latin" family plus a "latin-ext" fallback family so characters
 * such as ₹, ā or ł still render.
 */
import type { Font as FontType } from "@react-pdf/renderer";
import { RESUME_FONTS, getFont } from "@/config/templates";

type FontApi = typeof FontType;

const WEIGHTS = [400, 700] as const;
const STYLES = ["normal", "italic"] as const;

/** File name for one font face, matching @fontsource's naming. */
export function fontFile(id: string, subset: "latin" | "latin-ext", weight: number, style: string): string {
  return `${id}-${subset}-${weight}-${style}.woff`;
}

let registered = false;

/** Registers every resume font once. `src` maps a font file name to a URL or path. */
export function registerPdfFonts(Font: FontApi, src: (file: string) => string) {
  if (registered) return;
  for (const f of RESUME_FONTS) {
    for (const subset of ["latin", "latin-ext"] as const) {
      Font.register({
        family: subset === "latin" ? f.family : `${f.family} Ext`,
        fonts: WEIGHTS.flatMap((fontWeight) => STYLES.map((fontStyle) => ({ src: src(fontFile(f.id, subset, fontWeight, fontStyle)), fontWeight, fontStyle }))),
      });
    }
  }
  // Resumes should never hyphenate words.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

/** Primary family, its latin-ext fallback, then Inter Ext for glyphs a font lacks (Lato has no ₹). */
export function pdfFontFamily(fontId: string): string[] {
  const f = getFont(fontId);
  return [...new Set([f.family, `${f.family} Ext`, "Inter Ext"])];
}
