// Browser check for export: placeholder checklist blocks export, then PDF / DOCX /
// TXT / JSON download. Renders the PDF's first page to PNG next to a preview
// screenshot so they can be compared. Run against a dev server with MOCK_AI=true.
// Usage: BASE_URL=http://localhost:3005 OUT=<dir> node scripts/check-export.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { BASE, launch } from "./browser.mjs";

const require = createRequire(import.meta.url);
const OUT = process.env.OUT ?? "export-check";
const TEMPLATES = (process.env.TEMPLATES ?? "classic").split(",");
await mkdir(OUT, { recursive: true });
const { browser, context, page, errors } = await launch();
const step = (msg) => console.log(`✓ ${msg}`);

/** Renders page 1 of a PDF to PNG with pdf.js in a separate tab. */
async function renderPdf(pdfPath, pngPath) {
  const pdfjsDir = path.dirname(require.resolve("pdfjs-dist/build/pdf.mjs"));
  const tab = await context.newPage();
  const logs = [];
  tab.on("console", (m) => logs.push(m.text()));
  tab.on("pageerror", (e) => logs.push(e.message));
  await tab.route("http://render.local/**", async (route) => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (name === "doc.pdf") return route.fulfill({ body: await readFile(pdfPath), contentType: "application/pdf" });
    if (name === "index.html")
      return route.fulfill({
        contentType: "text/html",
        body: `<canvas id="c"></canvas><script type="module">
          import * as pdfjs from "/pdf.mjs";
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
          const doc = await pdfjs.getDocument({ url: "/doc.pdf" }).promise;
          const p = await doc.getPage(1);
          const v = p.getViewport({ scale: 1.5 });
          const c = document.getElementById("c"); c.width = v.width; c.height = v.height;
          await p.render({ canvas: c, viewport: v }).promise;
          const t = await p.getTextContent();
          window.__text = t.items.map((i) => i.str).join(" ");
          window.__pages = doc.numPages;
          document.title = "done";
        </script>`,
      });
    return route.fulfill({ body: await readFile(path.join(pdfjsDir, name)), contentType: "text/javascript" });
  });
  await tab.goto("http://render.local/index.html");
  await tab.waitForFunction(() => document.title === "done", null, { timeout: 30_000 }).catch((e) => {
    throw new Error(`PDF render failed: ${logs.join(" | ") || e.message}`);
  });
  await tab.locator("#c").screenshot({ path: pngPath });
  const result = { text: await tab.evaluate(() => window.__text), pages: await tab.evaluate(() => window.__pages) };
  await tab.close();
  return result;
}

async function download(buttonName, file) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: buttonName }).click()]);
  const target = path.join(OUT, file ?? dl.suggestedFilename());
  await dl.saveAs(target);
  return { target, name: dl.suggestedFilename() };
}

try {
  await page.goto(`${BASE}/start`);
  await page.getByRole("button", { name: /Try with sample data/ }).click();
  await page.waitForURL(/\/editor/);

  // Add a placeholder → export must be blocked.
  await page.getByRole("button", { name: /^Summary/ }).first().click();
  const summary = page.getByLabel(/^Summary/).first();
  const original = await summary.inputValue();
  await summary.fill(`${original} Mentored [number of students] juniors.`);
  await page.getByRole("button", { name: "⬇️ Export" }).click();
  await page.getByText(/Fill these placeholders first \(1\)/).waitFor();
  if (!(await page.getByRole("button", { name: /📄 PDF/ }).isDisabled())) throw new Error("PDF export not blocked by placeholder");
  step("export blocked with a placeholder checklist");
  const json = await download(/JSON backup/);
  step(`JSON backup still allowed (${json.name})`);
  await page.getByRole("button", { name: "Close" }).click();
  await summary.fill(original);

  for (const template of TEMPLATES) {
    // Switch template in the Design tab.
    await page.getByRole("tab", { name: /Design/ }).click();
    await page.getByRole("button", { name: new RegExp(`^${template}`, "i") }).first().click();
    await page.getByRole("tab", { name: /Content/ }).click();

    await page.locator(".resume-paper").first().screenshot({ path: path.join(OUT, `${template}-preview.png`) });
    await page.getByRole("button", { name: "⬇️ Export" }).click();
    const pdf = await download(/📄 PDF/, `${template}.pdf`);
    const { text, pages } = await renderPdf(pdf.target, path.join(OUT, `${template}-pdf.png`));
    if (!text.includes("Priya Sharma")) throw new Error(`${template}: PDF text not selectable`);
    step(`${template}: PDF downloaded (${pdf.name}), ${pages} page(s), text extractable`);
    const docx = await download(/Word \(\.docx\)/, `${template}.docx`);
    const head = (await readFile(docx.target)).subarray(0, 2).toString();
    if (head !== "PK") throw new Error("DOCX is not a zip");
    step(`${template}: DOCX downloaded`);
    const txt = await download(/Plain text/, `${template}.txt`);
    if (!(await readFile(txt.target, "utf8")).includes("EDUCATION")) throw new Error("TXT missing headings");
    step(`${template}: TXT downloaded`);
    await page.getByRole("button", { name: "Close" }).click();
  }

  await writeFile(path.join(OUT, "errors.txt"), errors.join("\n"));
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`All export checks passed. Files in ${OUT}`);
} catch (e) {
  await page.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true });
  console.error(e.message, errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
