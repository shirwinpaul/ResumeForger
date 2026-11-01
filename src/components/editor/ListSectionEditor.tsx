"use client";

import { useState } from "react";
import { itemLabel } from "@/config/section-fields";
import { useResumeStore } from "@/hooks/useResumeStore";
import { listOf, moveInArray } from "@/lib/resume/edit";
import { emptyItem, type ListSectionId, type Resume } from "@/lib/resume/schema";
import { DEFAULT_HEADINGS } from "@/lib/resume/sections";
import { ItemEditor } from "./ItemEditor";
import { SortableList } from "./SortableList";

const ADD_LABEL: Record<ListSectionId, string> = {
  education: "education",
  experience: "experience",
  projects: "project",
  leadership: "leadership role",
  volunteering: "volunteering role",
  achievements: "achievement",
  certifications: "certification",
  activities: "activity",
  publications: "publication",
};

/** Editor for a list section: reorderable, collapsible item cards with add/delete. */
export function ListSectionEditor({ resume, section }: { resume: Resume; section: ListSectionId }) {
  const { update } = useResumeStore();
  const items = listOf(resume, section);
  const [openId, setOpenId] = useState<string | null>(items.length === 1 ? items[0].id : null);
  const noun = DEFAULT_HEADINGS[section].toLowerCase();

  function add() {
    const item = emptyItem[section]();
    update((d) => {
      (listOf(d, section) as unknown[]).push(item);
    });
    setOpenId(item.id);
  }

  function remove(id: string, label: string) {
    if (!window.confirm(`Delete "${label}"? You can undo with Ctrl+Z.`)) return;
    update((d) => {
      const list = listOf(d, section);
      list.splice(
        list.findIndex((i) => i.id === id),
        1,
      );
    });
  }

  return (
    <div>
      {items.length === 0 && <p className="mb-3 text-sm text-muted">Nothing here yet.</p>}
      <SortableList
        items={items}
        label={noun}
        onMove={(from, to) =>
          update((d) => {
            (d[section] as unknown[]) = moveInArray(d[section] as unknown[], from, to);
          })
        }
        renderItem={(item, handle) => {
          const label = itemLabel(section, item);
          const open = openId === item.id;
          return (
            <div className="rounded-xl border border-border bg-surface">
              <div className="flex items-center gap-1 px-2 py-1.5">
                {handle}
                <button
                  type="button"
                  className="flex-1 truncate rounded px-1 py-1 text-left font-medium hover:bg-surface-2"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  {label}
                </button>
                <button type="button" className="btn btn-ghost btn-sm text-danger" aria-label={`Delete ${label}`} onClick={() => remove(item.id, label)}>
                  🗑
                </button>
                <span aria-hidden="true" className="text-muted">
                  {open ? "▴" : "▾"}
                </span>
              </div>
              {open && (
                <div className="border-t border-border p-3">
                  <ItemEditor section={section} item={item} />
                </div>
              )}
            </div>
          );
        }}
      />
      <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={add}>
        + Add {ADD_LABEL[section]}
      </button>
    </div>
  );
}
