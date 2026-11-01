/**
 * Text extraction from an uploaded resume, entirely in the browser —
 * the file itself is never uploaded anywhere.
 */

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_CHARS = 20_000;

export class ImportError extends Error {}

type PdfTextItem = { str: string; hasEOL?: boolean; transform?: number[] };

/** Joins pdf.js text items into lines, starting a new line on EOL or a y-position change. */
export function pdfItemsToText(items: PdfTextItem[]): string {
  let out = "";
  let lastY: number | undefined;
  for (const it of items) {
    if (typeof it.str !== "string") continue;
    const y = it.transform?.[5];
    if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) out += "\n";
    out += it.str;
    if (it.hasEOL) out += "\n";
    if (y !== undefined) lastY = y;
  }
  return out;
}

async function extractPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Copied from node_modules into /public by scripts/copy-assets.mjs (predev/prebuild).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, 10); i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(pdfItemsToText(content.items as PdfTextItem[]));
    }
    return pages.join("\n");
  } finally {
    void task.destroy();
  }
}

async function extractDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const res = await mammoth.extractRawText({ arrayBuffer: data });
  return res.value;
}

/** Tidies extracted text: normalises spaces/bullets, removes blank runs. */
export function tidyText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/^\s*[▪●•◦]\s*/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_IMPORT_CHARS);
}

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError("That file is over 5 MB. Try a smaller PDF or .docx, or paste the text instead.");
  const name = file.name.toLowerCase();
  const data = await file.arrayBuffer();
  let text: string;
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") text = await extractPdf(data);
    else if (name.endsWith(".docx")) text = await extractDocx(data);
    else throw new ImportError("Please choose a PDF or a Word (.docx) file. Old .doc files: save as .docx first.");
  } catch (e) {
    if (e instanceof ImportError) throw e;
    throw new ImportError("We couldn't read that file. It may be damaged or password-protected — try pasting the text instead.");
  }
  const clean = tidyText(text);
  if (clean.length < 40) {
    throw new ImportError("We couldn't find text in this file. If it's a scanned image, paste the text instead (or retype it in the builder).");
  }
  return clean;
}
