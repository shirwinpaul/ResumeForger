/**
 * Browser-side export: builds each file from the shared render model and
 * downloads it. The heavy libraries load only when the user exports.
 */
import { createElement } from "react";
import { buildRenderDoc } from "@/lib/resume/render-model";
import type { Resume } from "@/lib/resume/schema";
import { serializeBackup } from "./json";
import { renderPlainText } from "./text";

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Keeps a user-edited file name safe for every OS. */
export function safeFileName(name: string, ext: string): string {
  const base = name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80) || "Resume";
  return `${base}.${ext}`;
}

export async function resumeToPdfBlob(resume: Resume): Promise<Blob> {
  const [{ pdf, Font }, { ResumePdfDocument }, { registerPdfFonts }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./pdf-document"),
    import("./pdf-fonts"),
  ]);
  registerPdfFonts(Font, (file) => `${window.location.origin}/fonts/${file}`);
  return pdf(createElement(ResumePdfDocument, { doc: buildRenderDoc(resume) }) as Parameters<typeof pdf>[0]).toBlob();
}

export async function exportPdf(resume: Resume, fileName: string) {
  downloadBlob(await resumeToPdfBlob(resume), safeFileName(fileName, "pdf"));
}

export async function exportDocx(resume: Resume, fileName: string) {
  const { resumeToDocxBlob } = await import("./docx");
  downloadBlob(await resumeToDocxBlob(resume), safeFileName(fileName, "docx"));
}

export function exportText(resume: Resume, fileName: string) {
  downloadBlob(new Blob([renderPlainText(resume)], { type: "text/plain;charset=utf-8" }), safeFileName(fileName, "txt"));
}

export function exportJson(resumes: Resume[], fileName: string) {
  downloadBlob(new Blob([serializeBackup(resumes)], { type: "application/json" }), safeFileName(fileName, "json"));
}
