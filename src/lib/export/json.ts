import { migrateResume, newId, type Resume } from "@/lib/resume/schema";

/** JSON backup format for moving all resumes between devices. */
export const BACKUP_APP_ID = "resumeforge";
export const BACKUP_VERSION = 1;

export interface ResumeBackup {
  app: typeof BACKUP_APP_ID;
  backupVersion: number;
  exportedAt: string;
  resumes: Resume[];
}

export function createBackup(resumes: Resume[], now = new Date().toISOString()): ResumeBackup {
  return { app: BACKUP_APP_ID, backupVersion: BACKUP_VERSION, exportedAt: now, resumes };
}

export function serializeBackup(resumes: Resume[]): string {
  return JSON.stringify(createBackup(resumes), null, 2);
}

export interface ImportResult {
  resumes: Resume[];
  /** Human-readable problems for resumes that could not be imported. */
  errors: string[];
}

/**
 * Parses a backup file (or a single exported resume). Each resume is migrated
 * and validated individually so one bad entry doesn't block the rest.
 * Resumes whose id already exists get a fresh id so nothing is overwritten.
 */
export function parseBackup(json: string, existingIds: Iterable<string> = []): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { resumes: [], errors: ["This file isn't valid JSON."] };
  }
  const list: unknown[] =
    data && typeof data === "object" && Array.isArray((data as { resumes?: unknown }).resumes)
      ? (data as { resumes: unknown[] }).resumes
      : [data];

  const taken = new Set(existingIds);
  const resumes: Resume[] = [];
  const errors: string[] = [];
  list.forEach((entry, i) => {
    const result = migrateResume(entry);
    if (!result.ok) {
      errors.push(`Resume ${i + 1}: ${result.error}`);
      return;
    }
    const resume = result.resume;
    if (taken.has(resume.id)) resume.id = newId();
    taken.add(resume.id);
    resumes.push(resume);
  });
  return { resumes, errors };
}
