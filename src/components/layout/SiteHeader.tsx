"use client";

import Link from "next/link";
import { useState } from "react";
import { ForgeLogo } from "@/components/illustrations/ForgeLogo";
import { SettingsDialog } from "./SettingsDialog";
import { useSettings } from "@/hooks/useSettings";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [settings, update] = useSettings();
  const dark = settings.theme === "dark";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
          <ForgeLogo />
          <span>
            Resume<span className="text-accent">Forge</span>
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link href="/start" className="btn btn-ghost btn-sm" aria-label="My resumes">
            <span aria-hidden="true" className="sm:hidden">📁</span>
            <span className="hidden sm:inline">My resumes</span>
          </Link>
          <Link href="/editor" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Editor
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => update({ theme: dark ? "light" : "dark" })}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "☀️" : "🌙"}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
            ⚙️ <span className="hidden sm:inline">Settings</span>
          </button>
        </nav>
      </div>
      {open && <SettingsDialog open={open} onClose={() => setOpen(false)} />}
    </header>
  );
}
