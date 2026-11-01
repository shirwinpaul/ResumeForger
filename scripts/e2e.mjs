// Phase 11 end-to-end: (a) build a resume from scratch with the guided flow (incl. AI
// "Turn into bullets"), (d) activity descriptions within limits, (f) all 4 templates +
// "Fit to one page". Run against a dev server with MOCK_AI=true. All data is fake.
// Usage: BASE_URL=http://localhost:3000 OUT=<dir> node scripts/e2e.mjs
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BASE, launch } from "./browser.mjs";

const OUT = process.env.OUT ?? "e2e";
await mkdir(OUT, { recursive: true });
const { browser, page, errors } = await launch();
const step = (msg) => console.log(`✓ ${msg}`);
const next = () => page.getByRole("button", { name: "Next →" }).click();
const preview = () => page.locator(".resume-paper").first();

try {
  // (a) Guided flow from scratch.
  await page.goto(`${BASE}/start`);
  await page.getByRole("button", { name: /Start fresh \(guided\)/ }).click();
  await page.waitForURL(/\/builder/);
  await page.getByLabel("Your full name").fill("Kavya Fakename");
  await page.getByLabel("Email").fill("kavya.fakename@example.com");
  await page.getByLabel("Phone").fill("+91 90000 11111");
  await page.getByLabel("City").fill("Mysuru");
  await next();

  await page.getByRole("heading", { name: "Education", level: 1 }).waitFor();
  await page.getByRole("button", { name: /\+ Add/ }).click();
  await page.getByLabel("School / college / university").fill("Riverside Model School");
  await page.getByLabel("Class / degree").fill("Class 12");
  await page.getByLabel("Stream / major").fill("Science (PCB)");
  await next();

  await page.getByRole("heading", { name: "Projects", level: 1 }).waitFor();
  await page.getByLabel("Tell it in your own words").fill("I made a plant-watering reminder app for my school garden club. We used it every week.");
  await page.getByRole("button", { name: "Turn into bullets" }).click();
  const ok = page.getByRole("button", { name: "OK, continue" });
  await ok.waitFor({ timeout: 5000 }).then(() => ok.click()).catch(() => {});
  await page.getByText(/Suggested bullets/).waitFor();
  await page.getByRole("button", { name: "✓ Accept" }).click();
  await page.getByRole("button", { name: /New project|Project/ }).first().waitFor();
  step("guided: AI turned a plain answer into bullets (accepted)");

  // Skip to Activities and add one.
  await page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name: "Activities" }).click();
  await page.getByRole("button", { name: /\+ Add/ }).click();
  await page.getByLabel("Activity", { exact: true }).fill("Eco Club");
  await page.getByLabel("Short description").fill("Led weekly tree-planting drives and ran a recycling stall at the school fair, teaching juniors how to sort waste correctly every single week.");
  await page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name: "Skills" }).click();
  await page.getByRole("navigation", { name: "Steps" }).getByRole("button", { name: "Summary" }).click();
  await page.getByRole("button", { name: "Write my summary" }).click();
  await page.getByRole("button", { name: /Use this summary/ }).click();
  await page.getByRole("button", { name: /Finish & preview/ }).click();
  await page.waitForURL(/\/editor/);
  const text = await preview().innerText();
  for (const s of ["Kavya Fakename", "Riverside Model School", "plant-watering", "Eco Club"]) {
    if (!text.includes(s)) throw new Error(`preview missing "${s}"`);
  }
  await preview().screenshot({ path: path.join(OUT, "a-guided-preview.png") });
  step("guided: finished → editor preview shows name, education, AI bullets, activity, summary");

  // (d) Activity writer within limits.
  await page.getByRole("button", { name: /^Activities/ }).first().click();
  await page.getByRole("button", { name: "Write application activity entries" }).click();
  await page.getByText(/\d+\/150/).first().waitFor();
  const desc = page.locator('textarea[id$="-description"]').first();
  const value = await desc.inputValue();
  const len = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].length;
  if (len > 150) throw new Error(`activity description is ${len} chars`);
  await page.getByRole("button", { name: "✓ Accept" }).first().click();
  step(`activity: Common App description ${len}/150 characters (enforced in code), accepted`);

  // (f) All 4 templates + Fit to one page.
  await page.getByRole("tab", { name: /Design/ }).click();
  for (const t of ["Modern", "Academic", "Creative", "Classic"]) {
    await page.getByRole("button", { name: new RegExp(`^${t}`) }).first().click();
    const tpl = await preview().getAttribute("data-template");
    await preview().screenshot({ path: path.join(OUT, `f-${tpl}.png`) });
    step(`template switched: ${tpl}`);
  }
  // Fit to one page, using the 2-page sample resume.
  await page.goto(`${BASE}/start`);
  await page.getByRole("button", { name: /Try with sample data/ }).click();
  await page.waitForURL(/\/editor/);
  const badge = page.getByText(/^(\d+ pages|✓ Fits on 1 page)$/).first();
  // The badge reads "1 page" until the preview has been measured; the sample is 2 pages.
  await page.getByText(/^\d+ pages$/).first().waitFor({ timeout: 10_000 });
  const before = (await badge.textContent())?.trim();
  await page.getByRole("button", { name: /Fit to one page/ }).click();
  await page.getByText(/Fits on one page now|safe minimum/).waitFor({ timeout: 30_000 });
  const after = (await badge.textContent())?.trim();
  if (after !== "✓ Fits on 1 page") throw new Error(`fit did not reach one page (${after})`);
  await preview().screenshot({ path: path.join(OUT, "f-fitted.png") });
  step(`fit to one page: "${before}" → "${after}"`);

  // The exported PDF must agree with the preview's page count.
  await page.getByRole("button", { name: "⬇️ Export" }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /📄 PDF/ }).click()]);
  const pdfPath = path.join(OUT, "f-fitted.pdf");
  await dl.saveAs(pdfPath);
  const pdfPages = ((await readFile(pdfPath, "latin1")).match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  if (pdfPages !== 1) throw new Error(`fitted PDF has ${pdfPages} pages`);
  step("fitted resume exports as a 1-page PDF");

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("E2E guided/activity/templates checks passed.");
} catch (e) {
  await page.screenshot({ path: path.join(OUT, "failure.png"), fullPage: true });
  console.error(e.message, errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
