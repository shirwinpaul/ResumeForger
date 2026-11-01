/**
 * Common App–style activity character limits.
 * Verify current limits on the official application platform — they can change.
 */
export const ACTIVITY_LIMITS = {
  position: 50,
  organization: 100,
  description: 150,
} as const;

export type ActivityField = keyof typeof ACTIVITY_LIMITS;

/** Content-quality thresholds used by the code-based checks. */
export const QUALITY_LIMITS = {
  /** Roughly two lines on a one-column A4/Letter resume at 10–11pt. */
  maxBulletChars: 200,
  /** Summary longer than this reads as a paragraph, not a summary. */
  maxSummaryChars: 450,
} as const;

/** Safe ranges for template customisation and the "Fit to one page" helper. */
export const LAYOUT_LIMITS = {
  fontSizePt: { min: 9, max: 12, default: 10.5 },
  marginMm: { min: 10, max: 25, default: 18 },
  lineHeight: { min: 1.15, max: 1.5, default: 1.35 },
  sectionGapPt: { min: 4, max: 14, default: 10 },
} as const;
