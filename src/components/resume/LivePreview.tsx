"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PAGE_SIZES } from "@/config/templates";
import { buildRenderDoc } from "@/lib/resume/render-model";
import { nextFitStep, pageBreaksPx, pageCount, pageHeightPx, PX_PER_MM, resetSpacing } from "@/lib/resume/page-fit";
import type { Resume } from "@/lib/resume/schema";
import { getCountry } from "@/config/countries";
import { ResumePreview } from "./ResumePreview";
import { useResumeStore } from "@/hooks/useResumeStore";

/**
 * Live, scaled preview of the active resume with page-break markers and the
 * page-fit meter ("fits on 1 page" + "Fit to one page" helper).
 */
export function LivePreview({ resume, onPagesChange }: { resume: Resume; onPagesChange?: (pages: number) => void }) {
  const { update } = useResumeStore();
  const doc = useMemo(() => buildRenderDoc(resume), [resume]);
  const pageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [scale, setScale] = useState(0.6);
  const [fitting, setFitting] = useState(false);
  const [fitMessage, setFitMessage] = useState("");

  const size = resume.layout.pageSize;
  const widthPx = PAGE_SIZES[size].widthMm * PX_PER_MM;
  const pages = contentHeight ? pageCount(contentHeight, size, resume.layout.marginMm) : 1;
  const target = getCountry(resume.profile.country).studentPages;

  // Scale the page to the available width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, (e.contentRect.width - 4) / widthPx)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthPx]);

  // Measure the natural (unscaled) content height after every render.
  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc]);

  useEffect(() => {
    if (contentHeight) onPagesChange?.(pages);
  }, [pages, contentHeight, onPagesChange]);

  // Fit-to-one-page loop: tighten one step per frame (after layout settles)
  // until it fits or every setting is at its safe minimum.
  useEffect(() => {
    if (!fitting || !contentHeight) return;
    const frame = requestAnimationFrame(() => {
      if (pages <= 1) {
        setFitting(false);
        setFitMessage("✓ Fits on one page now.");
        return;
      }
      const next = nextFitStep(resume.layout);
      if (!next) {
        setFitting(false);
        setFitMessage(
          "Spacing and font size are at their safe minimum. Try trimming older or less relevant items, or shorten long bullets.",
        );
        return;
      }
      update((d) => {
        d.layout = next;
      }, "fit-to-page");
    });
    return () => cancelAnimationFrame(frame);
  }, [fitting, contentHeight, pages, resume.layout, update]);

  const breaks = pageBreaksPx(pages, size, resume.layout.marginMm);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`rounded-full px-2.5 py-1 font-semibold ${
              pages <= target ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
            }`}
          >
            {pages === 1 ? "✓ Fits on 1 page" : `${pages} pages`}
          </span>
          {pages > target && (
            <span className="text-muted">Aim for {target} page{target > 1 ? "s" : ""} as a student</span>
          )}
        </div>
        <div className="flex gap-2">
          {pages > 1 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={fitting}
              onClick={() => {
                setFitMessage("");
                setFitting(true);
              }}
            >
              {fitting ? "Fitting…" : "📏 Fit to one page"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFitMessage("");
              update((d) => {
                d.layout = resetSpacing(d.layout);
              });
            }}
          >
            Reset spacing
          </button>
        </div>
      </div>
      {fitMessage && <p className="text-sm text-muted">{fitMessage}</p>}

      <div ref={wrapRef} className="w-full">
        <div
          className="relative mx-auto overflow-hidden rounded shadow-lg ring-1 ring-black/10"
          style={{ width: widthPx * scale, height: Math.max(contentHeight, pageHeightPx(size)) * scale }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: widthPx }}>
            <ResumePreview ref={pageRef} doc={doc} />
          </div>
          {breaks.map((y, i) => (
            <div
              key={y}
              className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-red-400"
              style={{ top: y * scale }}
            >
              <span className="absolute right-1 -top-5 rounded bg-red-700 px-1.5 text-[10px] font-semibold text-white">
                Page {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
