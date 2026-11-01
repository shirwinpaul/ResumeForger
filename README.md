# ResumeForge 🔥📄

**Forge a resume that opens doors.** A friendly, mobile-ready resume builder for students (Class 9 to university) and early-career job seekers. Answer simple questions, watch a live preview, polish your wording with free AI — honestly — and export a real, text-based PDF or Word file.

> _Screenshot placeholders — add your own images to `docs/` and update these links:_
>
> ![Landing page](docs/screenshot-landing.png)
> ![Editor with live preview](docs/screenshot-editor.png)
> ![Tailor to a job](docs/screenshot-tailor.png)

---

## Features

- **Guided builder** — one section per step, a progress bar, examples and "tell it in your own words" boxes. Every step can be skipped.
- **Editor + live preview** — split view on desktop, Edit/Preview tabs on phones. Drag-and-drop (also with the keyboard) to reorder sections and items, show/hide sections, undo/redo, auto-save.
- **4 templates** — Classic ATS (default), Modern Clean, Academic / University and Creative (two columns, optional photo, clearly labelled _not ATS-friendly_). Accent colour, 5 fonts, font size, margins, date format, A4 / US Letter, and **Fit to one page**.
- **Honest AI tools** (free Gemini, with Groq as the fallback):
  - Turn a plain answer into bullets · Polish a bullet (3 options) · Make a bullet shorter
  - Write my summary · Suggest skills (each one cites where it came from)
  - **Tailor to a job description or a university programme** — keywords present vs. "Consider adding if true", order tips and rewritten bullets
  - Common App–style activity writer with live character counters
  - Grammar & consistency check
  - Import an existing resume (PDF / .docx / pasted text) into sections
- **Code-based checks (no AI)** — ATS score out of 100, content-quality checks with one-click fixes, a placeholder checklist and country tips.
- **Export** — PDF (selectable text, embedded fonts, clickable links), Word (.docx with real headings and bullet lists), plain text, and JSON backups of all your resumes.
- **Dark mode**, reduced-motion support and an automated accessibility audit (axe, WCAG 2.1 AA).

## The honesty promise 🤝

1. **The AI never invents achievements.** It only improves your wording. It may not add numbers, awards, skills, tools, roles, dates or results you didn't give it.
2. When a number would make a line stronger, the AI writes a visible placeholder such as `[number of students]`. Export stays blocked until you fill in or delete every placeholder.
3. A **code-based honesty check** compares every AI suggestion with your own words. New numbers, dates, money amounts or names are highlighted: _"⚠️ New detail — confirm it's true or remove it"_.
4. **You are in control.** Each suggestion is shown as a diff with **Accept / Edit / Reject**. Nothing changes until you accept it.
5. **Tailoring is honest.** It rewords and reorders what you already have. Missing keywords are only shown as "Consider adding if true" and are never inserted for you.

## Privacy 🔒

- Your resumes are stored **only in your browser** (IndexedDB, with a localStorage fallback). There is no database and no login.
- Before your first AI request the app tells you: _"Your resume text is sent to a free AI provider to generate suggestions. Your phone number, email and address are removed before sending."_ The removal really happens in code: the browser never puts contact fields into AI requests, and the server strips emails, phone numbers and addresses again before calling the AI.
- The server never stores or logs resume text. Its logs contain only the provider, HTTP status, error type and retry-after time.
- Imported files are read **inside your browser**; the file itself is never uploaded.
- If you add your own Gemini key in Settings, it is kept in your browser and sent only with your AI requests. It is never logged or stored on the server.

## What does "ATS-friendly" mean?

Many employers use an **Applicant Tracking System** (ATS) that reads your resume as plain text before a person sees it. ATS software can struggle with columns, tables, text boxes, icons used instead of words, and images. The Classic, Modern and Academic templates use a single column, standard headings ("Education", "Experience"…), real selectable text and standard fonts. The Checks tab scores your resume out of 100 and tells you what to fix. Use **Creative** only for portfolios or emailing a person directly.

---

## Run it on your computer (Windows, step by step)

You need **Node.js 22 or newer** — download the "LTS" version from <https://nodejs.org> and install it with the default options.

1. Open the project folder in **VS Code**.
2. Open a terminal: menu **Terminal → New Terminal**.
3. Install the project's packages (only needed once):
   ```powershell
   npm install
   ```
   If PowerShell says _"running scripts is disabled on this system"_, use `npm.cmd` instead of `npm` in every command, e.g. `npm.cmd install`.
4. Start the app:
   ```powershell
   npm run dev
   ```
5. Open <http://localhost:3000> in your browser. To stop the app, click in the terminal and press **Ctrl + C**.

The builder, preview, checks and all exports work **without any AI keys**. Keys are only needed for the ✨ AI buttons.

### Add your free AI keys

Keys go **only** in the file `.env.local` in the project folder (it was created for you from `.env.example`). Never share this file and never paste your keys into a chat.

1. **Gemini (main AI):** go to <https://aistudio.google.com/apikey>, sign in with a Google account, click **Create API key** and copy it.
2. **Groq (backup AI):** go to <https://console.groq.com/keys>, sign up, click **Create API Key** and copy it.
3. Open `.env.local` in VS Code and replace the placeholders:
   ```
   GEMINI_API_KEY=your-gemini-key
   GROQ_API_KEY=your-groq-key
   ```
4. Save the file, then restart the app (Ctrl + C, then `npm run dev`).

### Try the AI without using any quota

Set `MOCK_AI=true` in `.env.local` and restart. The AI buttons then return sample answers, and no AI provider is called. One sample "polish" answer deliberately invents "by 40%", so you can see the honesty check catch it. Mock mode is ignored in production builds. Set it back to `MOCK_AI=false` to use the real AI.

### Environment variables

| Variable | Where it's used | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Server only | Primary AI. Free key from Google AI Studio. |
| `GROQ_API_KEY` | Server only | Fallback AI. Free key from Groq. |
| `MOCK_AI` | Server, development only | `true` = sample AI answers, no quota used. Ignored in production. |
| `NEXT_PUBLIC_ADMITLENS_URL` | Browser (optional) | URL for the "🔍 Review it in AdmitLens" button in the export dialog. Leave empty to hide the button. |

Model names and limits live in one file, `src/config/ai.ts`. Free models get renamed from time to time. If AI calls start failing, check the official model lists linked at the top of that file.

### How the free AI is used carefully

- One click = one AI request, with short prompts, capped answer lengths and minimal "thinking".
- If Gemini is busy, the app waits for the time Gemini asks for (up to about 10 seconds) and retries once. After that, or on server errors, timeouts or unusable answers, it switches to Groq.
- When the per-minute limit is hit, you see a live countdown and your edits stay safe. When the daily quota is used up, the app says so. You can add your own free Gemini key in **Settings**, and you can keep editing and exporting without AI.
- AI answers must be strict JSON that passes validation. A bad answer is retried once with the problem explained.
- Everything you paste (resume text, job and programme descriptions) is treated as **data, never as instructions**, so hidden text in a job posting can't take over the AI.
- Each IP address can make 40 AI requests per hour. This limit lives in the server's memory, so on serverless hosting (Vercel) it is **best-effort**: each server instance keeps its own count, and counts reset on a cold start.

---

## Deploy to Vercel (free Hobby plan)

1. Put the project on GitHub (create a repository and push this folder). `.env.local` is git-ignored, so your keys are **not** uploaded — check this before pushing.
2. Go to <https://vercel.com>, sign in with GitHub, click **Add New → Project** and import the repository. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add `GEMINI_API_KEY` and `GROQ_API_KEY` (and `NEXT_PUBLIC_ADMITLENS_URL` if you want the button). Don't add `MOCK_AI`.
4. Click **Deploy**. AI routes are set to `maxDuration = 60` seconds, which the Hobby plan allows.

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server at http://localhost:3000 |
| `npm run build` / `npm start` | Production build / run it |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` · `npm run lint` | TypeScript and ESLint |
| `npm run check` | All of the above, in order |

Before `dev` and `build`, `scripts/copy-assets.mjs` copies the pdf.js worker and the resume fonts from `node_modules` into `public/`. These generated files are git-ignored.

**Browser checks** (they drive the installed Microsoft Edge through `playwright-core`). Start the app with `MOCK_AI=true`, then in a second terminal:

```powershell
$env:BASE_URL = "http://localhost:3000"
node scripts/check-ai.mjs       # every AI feature, Accept/Edit/Reject, honesty flags
node scripts/check-import.mjs   # PDF + .docx import and review
node scripts/check-export.mjs   # PDF / DOCX / TXT / JSON downloads; renders the PDF for comparison
node scripts/check-a11y.mjs     # axe accessibility audit, light + dark
node scripts/screens.mjs        # screenshots at desktop and 360px, checks horizontal scrolling
```

If the dev server ever shows old styles after an edit, stop it, delete the `.next/dev` folder and start it again.

### Project structure

```
src/app            pages + the /api/ai/[action] route
src/components     UI (builder, editor, ai, checks, export, import, resume preview…)
src/config         AI models, templates, countries, limits, section fields
src/lib/resume     data model (Zod), storage, history, shared render model
src/lib/ai         contracts, prompts, providers, runner (fallback/retries), privacy, rate limit, mock
src/lib/checks     honesty, ATS score, content quality, placeholders, country tips
src/lib/export     PDF, DOCX, plain text, JSON
src/lib/import     text extraction + mapping into the data model
src/data           fake sample resume ("Priya Sharma")
tests/             Vitest unit tests and fake fixtures
```

`PROJECT_SPEC.md` is the specification and `PROGRESS.md` records what was built and why.

## Credits

Fonts are served from the [Fontsource](https://fontsource.org) packages: Inter, Source Sans 3, Lato, Merriweather and EB Garamond, all under the SIL Open Font License. Illustrations are original. All sample people and data are fictional.

Built by Anand Raj.
