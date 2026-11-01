"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SECTION_FIELDS } from "@/config/section-fields";
import { useResumeStore } from "@/hooks/useResumeStore";
import { setItemField } from "@/lib/resume/edit";
import type { ListSectionId } from "@/lib/resume/schema";
import { ACTIVITY_LIMITS } from "@/config/limits";
import { CharCounter } from "@/components/ui/CharCounter";
import { BulletsField, CheckboxField, MonthField, SelectField, TagsField, TextField } from "./fields";

/** Lets the editor inject AI tools under each bullet without coupling the form to the AI layer. */
export interface BulletToolsTarget {
  section: ListSectionId;
  itemId: string;
  field: string;
  index: number;
  bullet: string;
}
export const BulletToolsContext = createContext<((t: BulletToolsTarget) => ReactNode) | null>(null);

export function ItemEditor({ section, item }: { section: ListSectionId; item: Record<string, unknown> & { id: string } }) {
  const { update } = useResumeStore();
  const renderTools = useContext(BulletToolsContext);
  const set = (key: string, value: unknown, coalesce = true) =>
    update((d) => setItemField(d, section, item.id, key, value), coalesce ? `${section}.${item.id}.${key}` : undefined);

  const fields = SECTION_FIELDS[section];
  const isCurrent = item.current === true;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const value = item[f.key];
        const limit = section === "activities" ? ACTIVITY_LIMITS[f.key as keyof typeof ACTIVITY_LIMITS] : undefined;
        const wrap = (node: ReactNode) => (
          <div key={f.key} className={f.half ? "" : "sm:col-span-2"}>
            {node}
            {limit !== undefined && (
              <div className="mt-0.5 text-right">
                <CharCounter value={String(value ?? "")} max={limit} />
              </div>
            )}
          </div>
        );
        switch (f.type) {
          case "text":
          case "url":
            return wrap(
              <TextField label={f.label} value={String(value ?? "")} placeholder={f.placeholder} help={f.help} onChange={(v) => set(f.key, v)} />,
            );
          case "textarea":
            return wrap(
              <TextField multiline label={f.label} value={String(value ?? "")} placeholder={f.placeholder} help={f.help} onChange={(v) => set(f.key, v)} />,
            );
          case "month":
            return wrap(
              <MonthField
                label={f.key === "end" && isCurrent ? "End (current)" : f.label}
                value={String(value ?? "")}
                disabled={f.key === "end" && isCurrent}
                onChange={(v) => set(f.key, v, false)}
              />,
            );
          case "current":
            return wrap(<CheckboxField label={f.label} checked={isCurrent} onChange={(v) => set("current", v, false)} />);
          case "select":
            return wrap(<SelectField label={f.label} value={String(value ?? "")} options={f.options ?? []} onChange={(v) => set(f.key, v, false)} />);
          case "tags":
            return wrap(
              <TagsField label={f.label} values={(value as string[]) ?? []} placeholder={f.placeholder} onChange={(v) => set(f.key, v, false)} />,
            );
          case "bullets":
            return wrap(
              <BulletsField
                label={f.label}
                help={f.help}
                values={(value as string[]) ?? []}
                onChange={(v, key) =>
                  update((d) => setItemField(d, section, item.id, f.key, v), key ? `${section}.${item.id}.${key}` : undefined)
                }
                renderTools={
                  renderTools
                    ? (bullet, index) => renderTools({ section, itemId: item.id, field: f.key, index, bullet })
                    : undefined
                }
              />,
            );
        }
      })}
    </div>
  );
}
