// Writes the fake import fixtures: tests/fixtures/sample-import.docx and .pdf
// Usage: node scripts/make-fixtures.mjs
import { writeFile } from "node:fs/promises";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import React from "react";
import { Document as PdfDoc, Page, Text, renderToBuffer, StyleSheet } from "@react-pdf/renderer";
import { IMPORT_SAMPLE } from "../tests/fixtures/import-sample.mjs";

const dir = new URL("../tests/fixtures/", import.meta.url);

// --- .docx ---
const children = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(IMPORT_SAMPLE.name)] }),
  new Paragraph(IMPORT_SAMPLE.contactLine),
];
for (const s of IMPORT_SAMPLE.sections) {
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s.heading)] }));
  for (const line of s.lines) {
    children.push(line.startsWith("• ") ? new Paragraph({ text: line.slice(2), bullet: { level: 0 } }) : new Paragraph(line));
  }
}
const docx = new Document({ sections: [{ children }] });
await writeFile(new URL("sample-import.docx", dir), await Packer.toBuffer(docx));

// --- .pdf (real text, so pdf.js can extract it) ---
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  heading: { marginTop: 10, fontFamily: "Helvetica-Bold" },
});
const h = React.createElement;
const pdf = h(
  PdfDoc,
  null,
  h(
    Page,
    { size: "A4", style: styles.page },
    h(Text, { style: styles.name }, IMPORT_SAMPLE.name),
    h(Text, null, IMPORT_SAMPLE.contactLine),
    ...IMPORT_SAMPLE.sections.flatMap((s) => [h(Text, { style: styles.heading, key: s.heading }, s.heading), ...s.lines.map((l, i) => h(Text, { key: `${s.heading}${i}` }, l))]),
  ),
);
await writeFile(new URL("sample-import.pdf", dir), await renderToBuffer(pdf));
console.log("Wrote tests/fixtures/sample-import.docx and sample-import.pdf");
