/**
 * Word (.docx) export from the shared render model. Uses real Word headings and a
 * real bulleted list, standard fonts and no tables, so it stays ATS-readable.
 * The Creative template's sidebar sections are placed after the main column
 * (Word has no ATS-safe way to do a sidebar).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  type ParagraphChild,
} from "docx";
import { PAGE_SIZES, getFont } from "@/config/templates";
import { buildRenderDoc, type RenderDoc, type RenderEntry } from "@/lib/resume/render-model";
import type { Resume } from "@/lib/resume/schema";
import { getTemplateStyle } from "@/lib/resume/template-style";

const TWIPS_PER_MM = 1440 / 25.4;
const BULLETS = "resume-bullets";

const hex = (c: string) => c.replace("#", "").slice(0, 6) || "111827";

type ParaOpts = ConstructorParameters<typeof Paragraph>[0] & object;

/** One entry as paragraphs; `before` (twips) separates it from the previous entry. */
function entryParagraphs(e: RenderEntry, tabPos: number, before: number): Paragraph[] {
  const opts: ParaOpts[] = [];
  const skillsLike = e.title && e.text && !e.subtitle && !e.bullets.length;
  if (skillsLike) {
    opts.push({ children: [new TextRun({ text: `${e.title}: `, bold: true }), new TextRun(e.text)] });
  } else {
    if (e.title || e.subtitle || e.date) {
      const runs: ParagraphChild[] = [];
      if (e.title) runs.push(new TextRun({ text: e.title, bold: true }));
      if (e.title && e.subtitle) runs.push(new TextRun(", "));
      if (e.subtitle) runs.push(new TextRun(e.subtitle));
      if (e.date) runs.push(new TextRun({ text: `	${e.date}` }));
      opts.push({ keepNext: true, tabStops: [{ type: TabStopType.RIGHT, position: tabPos }], children: runs });
    }
    if (e.meta) opts.push({ keepNext: e.bullets.length > 0, children: [new TextRun({ text: e.meta, italics: true, color: "374151" })] });
    if (e.text) opts.push({ children: [new TextRun(e.text)] });
    e.bullets.forEach((b) => opts.push({ numbering: { reference: BULLETS, level: 0 }, children: [new TextRun(b)] }));
  }
  if (opts[0]) opts[0] = { ...opts[0], spacing: { before } };
  return opts.map((o) => new Paragraph(o));
}

export function buildDocx(doc: RenderDoc): Document {
  const { layout } = doc;
  const s = getTemplateStyle(doc.template, layout.accent);
  const font = getFont(layout.font).family;
  const half = Math.round(layout.fontSizePt * 2); // docx sizes are half-points
  const page = PAGE_SIZES[layout.pageSize];
  const margin = Math.round(layout.marginMm * TWIPS_PER_MM);
  const contentWidth = Math.round(page.widthMm * TWIPS_PER_MM) - margin * 2;
  const line = Math.round(layout.lineHeight * 240);
  const align = s.nameAlign === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: align, children: [new TextRun(doc.name)] }),
  ];
  if (doc.headline) children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: doc.headline, color: "374151", size: Math.round(half * 1.1) })] }));
  if (doc.contacts.length) {
    const sep = s.contactSeparator || "  |  ";
    const runs: ParagraphChild[] = [];
    doc.contacts.forEach((c, i) => {
      if (i > 0) runs.push(new TextRun(sep));
      runs.push(c.href ? new ExternalHyperlink({ link: c.href, children: [new TextRun({ text: c.text, color: "111827" })] }) : new TextRun(c.text));
    });
    children.push(new Paragraph({ alignment: align, spacing: { after: 80 }, children: runs }));
  }

  // Main column first, then (Creative) sidebar sections.
  const sections = [...doc.sections.filter((x) => x.column === "main"), ...doc.sections.filter((x) => x.column === "side")];
  for (const sec of sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, children: [new TextRun(s.headingUppercase ? sec.heading.toUpperCase() : sec.heading)] }));
    // Entry gap ≈ 0.45em, like the preview (1pt = 20 twips).
    sec.entries.forEach((e, i) => children.push(...entryParagraphs(e, contentWidth, i === 0 ? 0 : Math.round(layout.fontSizePt * 0.45 * 20))));
  }

  return new Document({
    creator: "ResumeForge",
    title: `${doc.name} — Resume`,
    styles: {
      default: { document: { run: { font, size: half, color: "111827" }, paragraph: { spacing: { line, after: 0 } } } },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { font, size: Math.round(half * s.nameScale), bold: true, color: hex(s.nameColor) },
          paragraph: { spacing: { after: 40, line: 276 } },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font, size: Math.round(half * s.headingScale), bold: true, color: hex(s.headingColor) },
          paragraph: {
            spacing: { before: Math.round(layout.sectionGapPt * 20), after: Math.round(layout.fontSizePt * 7) },
            border: s.headingRule === "none" ? undefined : { bottom: { style: BorderStyle.SINGLE, size: s.headingRule === "solid" ? 8 : 6, color: hex(s.ruleColor), space: 1 } },
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 340, hanging: 220 } } } }],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: Math.round(page.widthMm * TWIPS_PER_MM), height: Math.round(page.heightMm * TWIPS_PER_MM) },
            margin: { top: margin, bottom: margin, left: margin, right: margin },
          },
        },
        children,
      },
    ],
  });
}

export async function resumeToDocxBlob(resume: Resume): Promise<Blob> {
  return Packer.toBlob(buildDocx(buildRenderDoc(resume)));
}
