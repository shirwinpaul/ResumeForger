// Copies browser assets from node_modules into /public (git-ignored, regenerated each time):
//  - the pdf.js worker (for PDF import), kept in sync with the installed pdfjs-dist
//  - resume fonts from @fontsource (for PDF export, so the PDF matches the preview)
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pub = new URL("../public/", import.meta.url);
await mkdir(new URL("fonts/", pub), { recursive: true });

await copyFile(require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"), new URL("pdf.worker.min.mjs", pub));

// Keep in sync with PDF_FONT_FILES in src/lib/export/pdf-fonts.ts.
const FONTS = ["inter", "source-sans-3", "lato", "merriweather", "eb-garamond"];
for (const font of FONTS) {
  const dir = path.join(path.dirname(require.resolve(`@fontsource/${font}/package.json`)), "files");
  for (const subset of ["latin", "latin-ext"]) {
    for (const weight of [400, 700]) {
      for (const style of ["normal", "italic"]) {
        const file = `${font}-${subset}-${weight}-${style}.woff`;
        await copyFile(path.join(dir, file), new URL(`fonts/${file}`, pub));
      }
    }
  }
}
