import path from "node:path";
import { createRequire } from "node:module";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { Packer } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { TEMPLATE_IDS } from "@/config/templates";
import { getSampleResume } from "@/data/sample-resume";
import { buildDocx } from "@/lib/export/docx";
import { safeFileName } from "@/lib/export/download";
import { parseBackup, serializeBackup } from "@/lib/export/json";
import { ResumePdfDocument } from "@/lib/export/pdf-document";
import { registerPdfFonts } from "@/lib/export/pdf-fonts";
import { buildRenderDoc } from "@/lib/resume/render-model";

const require = createRequire(import.meta.url);
registerPdfFonts(Font, (file) => {
  const pkg = file.replace(/-latin(-ext)?-\d{3}-(normal|italic)\.woff$/, "");
  return path.join(path.dirname(require.resolve(`@fontsource/${pkg}/package.json`)), "files", file);
});

async function docxXml(resume = getSampleResume()) {
  const buf = await Packer.toBuffer(buildDocx(buildRenderDoc(resume)));
  const zip = await JSZip.loadAsync(buf);
  return { doc: await zip.file("word/document.xml")!.async("string"), numbering: await zip.file("word/numbering.xml")!.async("string") };
}

async function pdfText(buf: Buffer): Promise<{ text: string; pages: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: false }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return { text, pages: doc.numPages };
}

describe("DOCX export", () => {
  it("uses real headings and a real bullet list", async () => {
    const { doc, numbering } = await docxXml();
    expect(doc).toContain('w:pStyle w:val="Heading1"');
    expect(doc).toContain('w:pStyle w:val="Title"');
    expect(doc).toContain("<w:numPr>");
    expect(numbering).toContain('w:val="bullet"');
    expect(doc).toContain("EDUCATION");
    expect(doc).toContain("Library Seat Finder");
    expect(doc).not.toContain("<w:tbl>");
  });

  it("makes contact links clickable", async () => {
    const { doc } = await docxXml();
    expect(doc).toContain("<w:hyperlink");
  });

  it("works for every template", async () => {
    for (const t of TEMPLATE_IDS) {
      const r = getSampleResume();
      r.layout.template = t;
      const { doc } = await docxXml(r);
      expect(doc, t).toContain("Priya Sharma");
    }
  });
});

describe("PDF export", () => {
  it("renders the sample resume with real, extractable text", async () => {
    const buf = await renderToBuffer(<ResumePdfDocument doc={buildRenderDoc(getSampleResume())} />);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const { text } = await pdfText(buf);
    expect(text).toContain("Priya Sharma");
    expect(text).toContain("Library Seat Finder");
    expect(text.toUpperCase()).toContain("EDUCATION");
  }, 30_000);

  it("renders every template, font and page size, keeping ₹ and accents as real text", async () => {
    const fonts = ["inter", "source-sans-3", "lato", "merriweather", "eb-garamond"];
    for (const [i, t] of TEMPLATE_IDS.entries()) {
      const r = getSampleResume();
      r.layout.template = t;
      r.layout.font = fonts[i % fonts.length];
      r.layout.pageSize = i % 2 ? "Letter" : "A4";
      r.summary += " Budget ₹5,000 for łódź café.";
      const buf = await renderToBuffer(<ResumePdfDocument doc={buildRenderDoc(r)} />);
      const { text } = await pdfText(buf);
      expect(text, t).toContain("₹");
    }
  }, 60_000);
});

describe("JSON backup", () => {
  it("round-trips resumes", () => {
    const r = getSampleResume();
    const { resumes, errors } = parseBackup(serializeBackup([r]));
    expect(errors).toEqual([]);
    expect(resumes[0]).toEqual(r);
  });
});

describe("safeFileName", () => {
  it("strips unsafe characters and keeps one extension", () => {
    expect(safeFileName('Priya/Sharma:"CV".pdf', "pdf")).toBe("PriyaSharmaCV.pdf");
    expect(safeFileName("   ", "docx")).toBe("Resume.docx");
  });
});
