import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { PAGE_SIZES } from "@/config/templates";
import type { RenderDoc, RenderEntry, RenderSection } from "@/lib/resume/render-model";
import { getTemplateStyle, PREVIEW_FONT_STACKS, type TemplateStyle } from "@/lib/resume/template-style";

/** Highlights unfilled [placeholders] so users notice them in the preview. */
function withPlaceholders(text: string): ReactNode {
  const parts = text.split(/(\[[^\]\n]{1,60}\])/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    /^\[[^\]]+\]$/.test(p) ? (
      <mark key={i} style={{ background: "#fde68a", color: "#78350f", borderRadius: 2, padding: "0 1px" }}>
        {p}
      </mark>
    ) : (
      p
    ),
  );
}

function Entry({ e, compact }: { e: RenderEntry; compact?: boolean }) {
  const firstLine = e.title || e.subtitle || e.date;
  const skillsLike = e.title && e.text && !e.subtitle && !e.bullets.length;
  if (skillsLike && !compact) {
    return (
      <p style={{ margin: "0 0 0.2em" }}>
        <strong>{e.title}:</strong> {withPlaceholders(e.text)}
      </p>
    );
  }
  return (
    <div style={{ marginBottom: "0.45em", breakInside: "avoid" }}>
      {firstLine && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1em", flexWrap: compact ? "wrap" : "nowrap" }}>
          <span>
            {e.title && <strong>{withPlaceholders(e.title)}</strong>}
            {e.title && e.subtitle && (compact ? <br /> : ", ")}
            {e.subtitle && <span>{withPlaceholders(e.subtitle)}</span>}
          </span>
          {e.date && <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{e.date}</span>}
        </div>
      )}
      {e.meta && <div style={{ fontStyle: "italic", color: compact ? "inherit" : "#374151" }}>{withPlaceholders(e.meta)}</div>}
      {e.text && <p style={{ margin: "0.1em 0 0" }}>{withPlaceholders(e.text)}</p>}
      {e.bullets.length > 0 && (
        <ul style={{ margin: "0.15em 0 0", paddingLeft: "1.2em", listStyleType: "disc" }}>
          {e.bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: "0.1em" }}>
              {withPlaceholders(b)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Section({ section, s, gap, onSidebar }: { section: RenderSection; s: TemplateStyle; gap: string; onSidebar?: boolean }) {
  const color = onSidebar ? s.sidebarText : s.headingColor;
  const rule =
    s.headingRule === "none"
      ? "none"
      : `${s.headingRule === "solid" ? 1 : 0.75}pt solid ${onSidebar ? "rgba(255,255,255,0.5)" : s.ruleColor}`;
  return (
    <section style={{ marginTop: gap }}>
      <h2
        style={{
          fontSize: `${s.headingScale}em`,
          fontWeight: 700,
          color,
          textTransform: s.headingUppercase ? "uppercase" : "none",
          letterSpacing: s.headingUppercase ? "0.06em" : 0,
          borderBottom: rule,
          paddingBottom: "0.1em",
          margin: "0 0 0.35em",
        }}
      >
        {section.heading}
      </h2>
      {section.entries.map((e, i) => (
        <Entry key={i} e={e} compact={onSidebar} />
      ))}
    </section>
  );
}

export interface ResumePreviewProps {
  doc: RenderDoc;
  /** Extra styles on the page element (e.g. scaling for thumbnails). */
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders a RenderDoc as an HTML page sized like real paper (mm/pt units), so
 * it matches the PDF export. Pure and hook-free — safe on the server too.
 */
export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(function ResumePreview(
  { doc, style, className = "" },
  ref,
) {
  const { layout } = doc;
  const s = getTemplateStyle(doc.template, layout.accent);
  const page = PAGE_SIZES[layout.pageSize];
  const gap = `${layout.sectionGapPt}pt`;
  const main = doc.sections.filter((x) => x.column === "main");
  const side = doc.sections.filter((x) => x.column === "side");

  const header = (
    <header style={{ textAlign: s.nameAlign }}>
      <h1 style={{ fontSize: `${s.nameScale}em`, fontWeight: 700, color: s.nameColor, margin: 0, lineHeight: 1.15 }}>
        {doc.name}
      </h1>
      {doc.headline && <p style={{ margin: "0.15em 0 0", fontSize: "1.1em", color: "#374151" }}>{doc.headline}</p>}
      {!s.twoColumn && doc.contacts.length > 0 && (
        <p style={{ margin: "0.35em 0 0", whiteSpace: "pre-wrap" }}>
          {doc.contacts.map((c, i) => (
            <span key={c.kind}>
              {i > 0 && s.contactSeparator}
              {c.href ? (
                <a href={c.href} style={{ color: "inherit", textDecoration: "none" }}>
                  {c.text}
                </a>
              ) : (
                c.text
              )}
            </span>
          ))}
        </p>
      )}
    </header>
  );

  return (
    <div
      ref={ref}
      className={`resume-paper ${className}`}
      data-template={doc.template}
      style={{
        width: `${page.widthMm}mm`,
        minHeight: `${page.heightMm}mm`,
        fontFamily: PREVIEW_FONT_STACKS[layout.font] ?? PREVIEW_FONT_STACKS.inter,
        fontSize: `${layout.fontSizePt}pt`,
        lineHeight: layout.lineHeight,
        boxSizing: "border-box",
        display: s.twoColumn ? "flex" : "block",
        padding: s.twoColumn ? 0 : `${layout.marginMm}mm`,
        ...style,
      }}
    >
      {s.twoColumn ? (
        <>
          <aside
            style={{
              width: "32%",
              background: s.sidebarBg,
              color: s.sidebarText,
              padding: `${layout.marginMm}mm ${layout.marginMm * 0.6}mm`,
              boxSizing: "border-box",
              fontSize: "0.92em",
            }}
          >
            {doc.photo && (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
              <img
                src={doc.photo}
                alt={`Photo of ${doc.name}`}
                style={{ width: "28mm", height: "28mm", objectFit: "cover", borderRadius: "50%", display: "block", margin: "0 auto 4mm", border: "2px solid rgba(255,255,255,0.7)" }}
              />
            )}
            <h2 style={{ fontSize: "1.05em", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.35em", borderBottom: "0.75pt solid rgba(255,255,255,0.5)" }}>
              Contact
            </h2>
            {doc.contacts.map((c) => (
              <p key={c.kind} style={{ margin: "0 0 0.25em", wordBreak: "break-word" }}>
                {c.text}
              </p>
            ))}
            {side.map((sec) => (
              <Section key={sec.id} section={sec} s={s} gap={gap} onSidebar />
            ))}
          </aside>
          <div style={{ flex: 1, padding: `${layout.marginMm}mm`, boxSizing: "border-box" }}>
            {header}
            {main.map((sec) => (
              <Section key={sec.id} section={sec} s={s} gap={gap} />
            ))}
          </div>
        </>
      ) : (
        <>
          {header}
          {main.map((sec) => (
            <Section key={sec.id} section={sec} s={s} gap={gap} />
          ))}
        </>
      )}
    </div>
  );
});
