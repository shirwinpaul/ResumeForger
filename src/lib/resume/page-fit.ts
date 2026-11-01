import { LAYOUT_LIMITS } from "@/config/limits";
import { PAGE_SIZES, type PageSize } from "@/config/templates";
import type { ResumeLayout } from "./schema";

export const PX_PER_MM = 96 / 25.4;

export function pageHeightPx(size: PageSize): number {
  return PAGE_SIZES[size].heightMm * PX_PER_MM;
}

/** Content height that fits on one page: the page minus its top and bottom margins, as in the PDF. */
export function usableHeightPx(size: PageSize, marginMm = 0): number {
  return pageHeightPx(size) - 2 * marginMm * PX_PER_MM;
}

/**
 * Number of pages the preview's content needs (2px tolerance for rounding).
 * `contentHeightPx` is the continuous preview's full height, including its top and
 * bottom margin; every PDF page repeats those margins.
 */
export function pageCount(contentHeightPx: number, size: PageSize, marginMm = 0): number {
  const body = contentHeightPx - 2 * marginMm * PX_PER_MM;
  return Math.max(1, Math.ceil((body - 2) / usableHeightPx(size, marginMm)));
}

/** Where each PDF page's content ends, as y positions in the continuous preview. */
export function pageBreaksPx(pages: number, size: PageSize, marginMm = 0): number[] {
  const usable = usableHeightPx(size, marginMm);
  return Array.from({ length: pages - 1 }, (_, i) => marginMm * PX_PER_MM + (i + 1) * usable);
}

/**
 * One step of the "Fit to one page" helper: returns a slightly tighter layout,
 * or null when every setting is already at its safe minimum. Tightens the
 * least visible settings first (gaps, then line height, margins, font size).
 */
export function nextFitStep(layout: ResumeLayout): ResumeLayout | null {
  const L = LAYOUT_LIMITS;
  const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  if (layout.sectionGapPt > L.sectionGapPt.min + 2) {
    return { ...layout, sectionGapPt: Math.max(L.sectionGapPt.min + 2, layout.sectionGapPt - 2) };
  }
  if (layout.lineHeight > 1.25) {
    return { ...layout, lineHeight: round(Math.max(1.25, layout.lineHeight - 0.05)) };
  }
  if (layout.marginMm > 14) {
    return { ...layout, marginMm: Math.max(14, layout.marginMm - 2) };
  }
  if (layout.fontSizePt > 10) {
    return { ...layout, fontSizePt: round(Math.max(10, layout.fontSizePt - 0.5), 1) };
  }
  if (layout.sectionGapPt > L.sectionGapPt.min) {
    return { ...layout, sectionGapPt: L.sectionGapPt.min };
  }
  if (layout.lineHeight > L.lineHeight.min) {
    return { ...layout, lineHeight: round(Math.max(L.lineHeight.min, layout.lineHeight - 0.05)) };
  }
  if (layout.marginMm > L.marginMm.min) {
    return { ...layout, marginMm: Math.max(L.marginMm.min, layout.marginMm - 2) };
  }
  if (layout.fontSizePt > L.fontSizePt.min) {
    return { ...layout, fontSizePt: round(Math.max(L.fontSizePt.min, layout.fontSizePt - 0.5), 1) };
  }
  return null;
}

export function resetSpacing(layout: ResumeLayout): ResumeLayout {
  const L = LAYOUT_LIMITS;
  return {
    ...layout,
    fontSizePt: L.fontSizePt.default,
    marginMm: L.marginMm.default,
    lineHeight: L.lineHeight.default,
    sectionGapPt: L.sectionGapPt.default,
  };
}
