"use client";

import { useId, useState, type ReactNode } from "react";

/** Small, accessible form primitives used across the editor and guided builder. */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  help,
  multiline,
  rows = 3,
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  help?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  autoComplete?: string;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="input"
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-describedby={helpId}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          type={type}
          value={value}
          placeholder={placeholder}
          aria-describedby={helpId}
          maxLength={maxLength}
          autoComplete={autoComplete ?? "off"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {help && (
        <p id={helpId} className="mt-1 text-xs text-muted">
          {help}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[] | readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o[0].toUpperCase() + o.slice(1) } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/** Month picker storing "YYYY-MM". */
export function MonthField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        className="input"
        type="month"
        value={/^\d{4}-\d{2}$/.test(value) ? value : ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

/** Chip input: type a value and press Enter or comma to add it. */
export function TagsField({
  label,
  values,
  onChange,
  placeholder = "Type and press Enter",
  help,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  help?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const lower = values.map((v) => v.toLowerCase());
    const added = parts.filter((p) => !lower.includes(p.toLowerCase()));
    if (added.length) onChange([...values, ...added]);
    setDraft("");
  }

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="input flex flex-wrap items-center gap-1.5 !py-1.5">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-0.5 text-sm text-primary-strong">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              className="rounded px-0.5 hover:bg-black/10"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          className="min-w-[8rem] flex-1 bg-transparent outline-none py-0.5"
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
        />
      </div>
      {help && <p className="mt-1 text-xs text-muted">{help}</p>}
    </div>
  );
}

/** Editable list of bullets with add / remove / move, plus an optional per-bullet toolbar. */
export function BulletsField({
  label,
  values,
  onChange,
  help,
  renderTools,
}: {
  label: string;
  values: string[];
  onChange: (v: string[], coalesceKey?: string) => void;
  help?: string;
  renderTools?: (bullet: string, index: number) => ReactNode;
}) {
  const groupId = useId();
  const move = (from: number, to: number) => {
    if (to < 0 || to >= values.length) return;
    const next = [...values];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      {help && <p className="-mt-1 mb-2 text-xs text-muted">{help}</p>}
      <ol className="space-y-2">
        {values.map((b, i) => (
          <li key={i} className="rounded-lg border border-border bg-surface-2/50 p-2">
            <div className="flex gap-2">
              <span aria-hidden="true" className="pt-2 text-muted">
                •
              </span>
              <textarea
                aria-label={`Bullet ${i + 1}`}
                id={`${groupId}-${i}`}
                className="input min-h-[2.75rem] flex-1"
                rows={2}
                value={b}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = e.target.value;
                  onChange(next, `${groupId}-${i}`);
                }}
              />
              <div className="flex flex-col gap-0.5">
                <button type="button" className="btn btn-ghost btn-sm !px-1.5" aria-label={`Move bullet ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  ↑
                </button>
                <button type="button" className="btn btn-ghost btn-sm !px-1.5" aria-label={`Move bullet ${i + 1} down`} disabled={i === values.length - 1} onClick={() => move(i, i + 1)}>
                  ↓
                </button>
                <button type="button" className="btn btn-ghost btn-sm !px-1.5 text-danger" aria-label={`Delete bullet ${i + 1}`} onClick={() => onChange(values.filter((_, j) => j !== i))}>
                  ✕
                </button>
              </div>
            </div>
            {renderTools && b.trim() && <div className="mt-1.5 pl-5">{renderTools(b, i)}</div>}
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-ghost btn-sm mt-2 text-primary" onClick={() => onChange([...values, ""])}>
        + Add bullet
      </button>
    </fieldset>
  );
}
