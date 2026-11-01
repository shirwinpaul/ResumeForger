"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useResumeStore, useUndoShortcuts } from "@/hooks/useResumeStore";
import { LivePreview } from "@/components/resume/LivePreview";
import { ContentPanel } from "./ContentPanel";
import { SectionsManager } from "./SectionsManager";
import { DesignPanel } from "./DesignPanel";
import { ChecksPanel } from "@/components/checks/ChecksPanel";
import { BulletTools, TrimIssueTool } from "@/components/ai/BulletTools";
import { ActivityWriter, SkillsSuggester, SummaryWriter } from "@/components/ai/SectionTools";
import { GrammarCheck, TailorPanel } from "@/components/ai/TailorPanel";
import { BulletToolsContext, type BulletToolsTarget } from "./ItemEditor";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { QualityIssue } from "@/lib/checks/quality";

type TabId = "content" | "sections" | "design" | "checks" | "tailor";

const TABS: { id: TabId; label: string }[] = [
  { id: "content", label: "✏️ Content" },
  { id: "sections", label: "↕️ Sections" },
  { id: "design", label: "🎨 Design" },
  { id: "checks", label: "✅ Checks" },
  { id: "tailor", label: "🎯 Tailor" },
];

const renderBulletTools = (t: BulletToolsTarget) => <BulletTools target={t} />;

function renderIssueTools(issue: QualityIssue) {
  if (issue.type !== "long-bullet" || issue.field === undefined || issue.index === undefined || !issue.original) return null;
  return <TrimIssueTool section={issue.section} itemId={issue.itemId} field={issue.field} index={issue.index} original={issue.original} />;
}

function SaveStatus() {
  const { saveState, saveError } = useResumeStore();
  if (saveState === "error") return <span className="text-sm text-danger" role="alert">⚠️ {saveError}</span>;
  return (
    <span className="text-xs text-muted" role="status" aria-live="polite">
      {saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved in this browser" : ""}
    </span>
  );
}

export function EditorWorkspace() {
  const { loaded, resume, undo, redo, canUndo, canRedo } = useResumeStore();
  const [tab, setTab] = useState<TabId>("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [pages, setPages] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  useUndoShortcuts();

  if (!loaded) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-muted" role="status">Loading your resume…</div>;
  }
  if (!resume) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No resume open</h1>
        <p className="mt-2 text-muted">Start a new resume, import one, or open a saved version.</p>
        <Link href="/start" className="btn btn-primary mt-6">
          Go to my resumes
        </Link>
      </div>
    );
  }

  const panels: Record<TabId, ReactNode> = {
    content: (
      <ContentPanel
        resume={resume}
        sectionExtras={{
          summary: <SummaryWriter resume={resume} />,
          skills: <SkillsSuggester resume={resume} />,
          activities: <ActivityWriter resume={resume} />,
        }}
      />
    ),
    sections: <SectionsManager resume={resume} />,
    design: <DesignPanel resume={resume} />,
    checks: (
      <div className="space-y-4">
        <ChecksPanel resume={resume} pages={pages} renderIssueTools={renderIssueTools} />
        <GrammarCheck resume={resume} />
      </div>
    ),
    tailor: <TailorPanel resume={resume} />,
  };

  return (
    <BulletToolsContext.Provider value={renderBulletTools}>
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{resume.name}</h1>
          <SaveStatus />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={undo} disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">
            ↶ <span className="hidden sm:inline">Undo</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={redo} disabled={!canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)">
            ↷ <span className="hidden sm:inline">Redo</span>
          </button>
          <Link href="/builder" className="btn btn-secondary btn-sm">
            🧭 Guided
          </Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setExporting(true)}>
            ⬇️ Export
          </button>
        </div>
        <ExportDialog key={exporting ? "open" : "closed"} resume={resume} open={exporting} onClose={() => setExporting(false)} />
      </div>

      {/* Mobile: Edit / Preview tabs */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 lg:hidden" role="tablist" aria-label="View">
        {(["edit", "preview"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={mobileView === v}
            className={`btn btn-sm ${mobileView === v ? "bg-surface shadow text-text" : "btn-ghost"}`}
            onClick={() => setMobileView(v)}
          >
            {v === "edit" ? "✏️ Edit" : "👁 Preview"}
          </button>
        ))}
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={`${mobileView === "edit" ? "block" : "hidden"} lg:block min-w-0`}>
          <div className="mb-3 flex gap-1 overflow-x-auto" role="tablist" aria-label="Editor panels">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {panels[tab]}
          </div>
        </div>
        <div className={`${mobileView === "preview" ? "block" : "hidden"} lg:block min-w-0`}>
          <div className="lg:sticky lg:top-16">
            <LivePreview resume={resume} onPagesChange={setPages} />
          </div>
        </div>
      </div>
    </div>
    </BulletToolsContext.Provider>
  );
}
