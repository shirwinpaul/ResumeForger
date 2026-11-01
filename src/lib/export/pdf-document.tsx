/**
 * The PDF version of ResumePreview, built from the same RenderDoc and template
 * tokens so preview and PDF match. Text is real (selectable, ATS-readable).
 * Loaded on demand — @react-pdf/renderer is large.
 */
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { PAGE_SIZES } from "@/config/templates";
import type { RenderDoc, RenderEntry, RenderSection } from "@/lib/resume/render-model";
import { getTemplateStyle, type TemplateStyle } from "@/lib/resume/template-style";
import { pdfFontFamily } from "./pdf-fonts";

export const MM_TO_PT = 72 / 25.4;

const NBSP = " ";

/**
 * Splits long links/emails after URL punctuation. Rendered as chunks in a wrapping
 * row, they can break across lines in the narrow sidebar (react-pdf never breaks a word).
 */
export function breakChunks(text: string): string[] {
  return text.split(/(?<=[/@.\-_])/);
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  bulletRow: { flexDirection: "row" },
});

/**
 * CSS collapses an entry's bottom margin into the next section's top margin; react-pdf
 * adds them. `last` drops the trailing margins so spacing matches the preview.
 */
function EntryView({ e, base, compact, last }: { e: RenderEntry; base: number; compact?: boolean; last?: boolean }) {
  const firstLine = e.title || e.subtitle || e.date;
  const skillsLike = e.title && e.text && !e.subtitle && !e.bullets.length;
  if (skillsLike && !compact) {
    return (
      <Text style={{ marginBottom: last ? 0 : base * 0.2 }}>
        <Text style={{ fontWeight: 700 }}>{e.title}:</Text> {e.text}
      </Text>
    );
  }
  return (
    <View style={{ marginBottom: last ? 0 : base * 0.45 }} wrap={e.bullets.length > 6}>
      {firstLine &&
        (compact ? (
          <View>
            {e.title ? <Text style={{ fontWeight: 700 }}>{e.title}</Text> : null}
            {e.subtitle ? <Text>{e.subtitle}</Text> : null}
            {e.date ? <Text>{e.date}</Text> : null}
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={{ flex: 1, paddingRight: base }}>
              {e.title ? <Text style={{ fontWeight: 700 }}>{e.title}</Text> : null}
              {e.title && e.subtitle ? ", " : ""}
              {e.subtitle || ""}
            </Text>
            {e.date ? <Text>{e.date}</Text> : null}
          </View>
        ))}
      {e.meta ? <Text style={{ fontStyle: "italic", color: compact ? undefined : "#374151" }}>{e.meta}</Text> : null}
      {e.text ? <Text style={{ marginTop: base * 0.1 }}>{e.text}</Text> : null}
      {e.bullets.length > 0 && (
        <View style={{ marginTop: base * 0.15 }}>
          {e.bullets.map((b, i) => (
            <View key={i} style={[styles.bulletRow, { marginBottom: i === e.bullets.length - 1 ? 0 : base * 0.1 }]}>
              <Text style={{ width: base * 1.2, paddingLeft: base * 0.3 }}>•</Text>
              <Text style={{ flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SectionView({ section, s, base, gap, onSidebar }: { section: RenderSection; s: TemplateStyle; base: number; gap: number; onSidebar?: boolean }) {
  const ruleColor = onSidebar ? "rgba(255,255,255,0.5)" : s.ruleColor;
  const [first, ...rest] = section.entries;
  const entry = (e: RenderEntry, i: number) => <EntryView key={i} e={e} base={base} compact={onSidebar} last={i === section.entries.length - 1} />;
  return (
    <View style={{ marginTop: gap }}>
      {/* The heading always stays on the same page as its first entry. */}
      <View wrap={false}>
        <Text
          style={{
            fontSize: base * s.headingScale,
            fontWeight: 700,
            color: onSidebar ? s.sidebarText : s.headingColor,
            textTransform: s.headingUppercase ? "uppercase" : "none",
            letterSpacing: s.headingUppercase ? base * s.headingScale * 0.06 : 0,
            borderBottomWidth: s.headingRule === "none" ? 0 : s.headingRule === "solid" ? 1 : 0.75,
            borderBottomColor: ruleColor,
            paddingBottom: base * 0.1,
            marginBottom: base * 0.35,
          }}
        >
          {section.heading}
        </Text>
        {first && entry(first, 0)}
      </View>
      {rest.map((e, i) => entry(e, i + 1))}
    </View>
  );
}

export function ResumePdfDocument({ doc }: { doc: RenderDoc }) {
  const { layout } = doc;
  const s = getTemplateStyle(doc.template, layout.accent);
  const size = PAGE_SIZES[layout.pageSize];
  const base = layout.fontSizePt;
  const margin = layout.marginMm * MM_TO_PT;
  const gap = layout.sectionGapPt;
  const main = doc.sections.filter((x) => x.column === "main");
  const side = doc.sections.filter((x) => x.column === "side");
  const separator = s.contactSeparator.replace(/ /g, NBSP);

  const header: ReactNode = (
    <View style={{ textAlign: s.nameAlign }}>
      <Text style={{ fontSize: base * s.nameScale, fontWeight: 700, color: s.nameColor, lineHeight: 1.15 }}>{doc.name}</Text>
      {doc.headline ? <Text style={{ marginTop: base * 0.15, fontSize: base * 1.1, color: "#374151" }}>{doc.headline}</Text> : null}
      {!s.twoColumn && doc.contacts.length > 0 && (
        // Each contact (with its trailing separator) is an unbreakable chunk, so lines wrap between items.
        <View style={{ marginTop: base * 0.35, flexDirection: "row", flexWrap: "wrap", justifyContent: s.nameAlign === "center" ? "center" : "flex-start" }}>
          {doc.contacts.map((c, i) => (
            <Text key={c.kind} wrap={false}>
              {c.href ? (
                <Link src={c.href} style={{ color: "#111827", textDecoration: "none" }}>
                  {c.text}
                </Link>
              ) : (
                c.text
              )}
              {i < doc.contacts.length - 1 ? separator : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const pageStyle = {
    fontFamily: pdfFontFamily(layout.font),
    fontSize: base,
    lineHeight: layout.lineHeight,
    color: "#111827",
  };
  const pageSize: [number, number] = [size.widthMm * MM_TO_PT, size.heightMm * MM_TO_PT];

  return (
    <Document title={`${doc.name} — Resume`} author={doc.name} subject="Resume" creator="ResumeForge" producer="ResumeForge">
      {s.twoColumn ? (
        <Page size={pageSize} style={{ ...pageStyle, flexDirection: "row", paddingVertical: margin }}>
          {/* Sidebar colour fills every page, behind the flowing content. */}
          <View fixed style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "32%", backgroundColor: s.sidebarBg }} />
          <View style={{ width: "32%", paddingHorizontal: margin * 0.6, color: s.sidebarText, fontSize: base * 0.92 }}>
            {doc.photo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
              <Image src={doc.photo} style={{ width: 28 * MM_TO_PT, height: 28 * MM_TO_PT, borderRadius: 14 * MM_TO_PT, objectFit: "cover", alignSelf: "center", marginBottom: 4 * MM_TO_PT }} />
            ) : null}
            <Text
              style={{
                fontSize: base * 0.92 * 1.05,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: base * 0.06,
                borderBottomWidth: 0.75,
                borderBottomColor: "rgba(255,255,255,0.5)",
                marginBottom: base * 0.35,
              }}
            >
              Contact
            </Text>
            {doc.contacts.map((c) => (
              <View key={c.kind} style={{ marginBottom: base * 0.25, flexDirection: "row", flexWrap: "wrap" }}>
                {breakChunks(c.text).map((chunk, i) => (
                  <Text key={i}>{chunk}</Text>
                ))}
              </View>
            ))}
            {side.map((sec) => (
              <SectionView key={sec.id} section={sec} s={s} base={base * 0.92} gap={gap} onSidebar />
            ))}
          </View>
          <View style={{ flex: 1, paddingHorizontal: margin }}>
            {header}
            {main.map((sec) => (
              <SectionView key={sec.id} section={sec} s={s} base={base} gap={gap} />
            ))}
          </View>
        </Page>
      ) : (
        <Page size={pageSize} style={{ ...pageStyle, padding: margin }}>
          {header}
          {main.map((sec) => (
            <SectionView key={sec.id} section={sec} s={s} base={base} gap={gap} />
          ))}
        </Page>
      )}
    </Document>
  );
}
