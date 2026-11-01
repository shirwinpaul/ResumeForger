// Browser check for import (PDF + .docx, basic and AI). Run against MOCK_AI=true.
// Usage: BASE_URL=http://localhost:3005 node scripts/check-import.mjs
import { fileURLToPath } from "node:url";
import { BASE, launch } from "./browser.mjs";

const fixture = (name) => fileURLToPath(new URL(`../tests/fixtures/${name}`, import.meta.url));
const { browser, page, errors } = await launch();
const step = (msg) => console.log(`✓ ${msg}`);

async function importFile(name, mode) {
  await page.goto(`${BASE}/import`);
  await page.locator('input[type="file"]').setInputFiles(fixture(name));
  await page.getByRole("heading", { name: /Check the text/ }).waitFor();
  const text = await page.getByLabel("Extracted resume text").inputValue();
  if (!text.includes("Arjun Testwala") || !text.includes("PROJECTS")) throw new Error(`${name}: text not extracted:\n${text}`);
  if (mode === "ai") {
    await page.getByRole("button", { name: "Read with AI" }).click();
    const ok = page.getByRole("button", { name: "OK, continue" });
    if (await ok.isVisible().catch(() => false)) await ok.click();
  } else {
    await page.getByRole("button", { name: "Read without AI (basic)" }).click();
  }
  await page.getByRole("heading", { name: "Review before saving" }).waitFor();
  const contact = await page.getByText(/^Contact found:/).textContent();
  if (!contact?.includes("arjun.testwala@example.com")) throw new Error(`${name}: email not detected locally (${contact})`);
}

try {
  await importFile("sample-import.pdf", "basic");
  await page.getByRole("region", { name: "Preview of the imported resume" }).getByText("Line-Following Robot").first().waitFor();
  step("PDF → text extracted → basic parse → review with preview");

  await importFile("sample-import.docx", "ai");
  step(".docx → text extracted → AI (mock) parse → review");

  // Untick a section and save.
  await page.getByRole("button", { name: "✓ Use this resume" }).click();
  await page.waitForURL(/\/editor/);
  await page.getByText("Saved in this browser").waitFor();
  step("imported resume opened in the editor and saved");

  // Paste path + bad file message.
  await page.goto(`${BASE}/import`);
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await page.getByRole("alert").getByText(/PDF or a Word/).waitFor();
  step("unsupported file shows a friendly message");

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("All import checks passed.");
} catch (e) {
  await page.screenshot({ path: process.env.SHOT ?? "import-check-failure.png", fullPage: true });
  console.error(e.message, errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
