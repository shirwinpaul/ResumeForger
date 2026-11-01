import { NON_ATS_WARNING, PAGE_SIZES, TEMPLATES, TEMPLATE_IDS } from "@/config/templates";
import { getSampleResume } from "@/data/sample-resume";
import { buildRenderDoc } from "@/lib/resume/render-model";
import { PX_PER_MM } from "@/lib/resume/page-fit";
import { ResumePreview } from "@/components/resume/ResumePreview";

const THUMB_SCALE = 0.3;

/** Thumbnails rendered from the fake sample resume with the real preview renderer. */
export function TemplateGallery() {
  const page = PAGE_SIZES.A4;
  const w = page.widthMm * PX_PER_MM;
  const h = page.heightMm * PX_PER_MM;
  return (
    <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {TEMPLATE_IDS.map((id) => {
        const t = TEMPLATES[id];
        const resume = getSampleResume();
        resume.layout.template = id;
        if (id === "academic" && t.preferredOrder) resume.layout.sectionOrder = t.preferredOrder as typeof resume.layout.sectionOrder;
        return (
          <li key={id} className="card overflow-hidden">
            {/* inert: a decorative picture — hidden from screen readers and its links can't take focus. */}
            <div className="bg-surface-2 p-3 flex justify-center" aria-hidden="true" inert>
              <div className="overflow-hidden rounded shadow ring-1 ring-black/10" style={{ width: w * THUMB_SCALE, height: h * THUMB_SCALE }}>
                <div style={{ transform: `scale(${THUMB_SCALE})`, transformOrigin: "top left", width: w }}>
                  <ResumePreview doc={buildRenderDoc(resume)} />
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted">{t.description}</p>
              <p className={`mt-2 text-xs font-semibold ${t.atsFriendly ? "text-success" : "text-warning"}`}>
                {t.atsFriendly ? "✓ ATS-friendly" : `⚠️ ${NON_ATS_WARNING}`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
