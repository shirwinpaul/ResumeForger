import { describe, expect, it } from "vitest";
import { createMemoryStore, createResumeRepository, StorageFullError, type KeyValueStore } from "@/lib/resume/storage";
import { createHistory, pushHistory, redo, undo, HISTORY_LIMIT } from "@/lib/resume/history";
import { getSampleResume } from "@/data/sample-resume";
import { createEmptyResume } from "@/lib/resume/schema";
import { parseBackup, serializeBackup } from "@/lib/export/json";

describe("resume repository", () => {
  it("saves, lists, loads, duplicates and deletes versions", async () => {
    const repo = createResumeRepository(createMemoryStore());
    const a = getSampleResume();
    const b = createEmptyResume("Oxford CS", "2026-02-01T00:00:00.000Z");
    await repo.saveResume(a);
    await repo.saveResume(b);

    const list = await repo.listResumes();
    expect(list.map((s) => s.name)).toEqual(["Oxford CS", "Sample – Priya Sharma"]);
    expect(await repo.loadResume(a.id)).toEqual(a);

    const copy = await repo.duplicateResume(a.id, "Internship – Web Dev");
    expect(copy?.name).toBe("Internship – Web Dev");
    expect(copy?.id).not.toBe(a.id);
    expect(copy?.contact.fullName).toBe("Priya Sharma");
    expect((await repo.listResumes()).length).toBe(3);

    await repo.deleteResume(a.id);
    expect(await repo.loadResume(a.id)).toBeNull();
    expect((await repo.listResumes()).length).toBe(2);
  });

  it("updates an existing entry instead of duplicating it", async () => {
    const repo = createResumeRepository(createMemoryStore());
    const r = getSampleResume();
    await repo.saveResume(r);
    await repo.saveResume({ ...r, name: "Renamed" });
    const list = await repo.listResumes();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Renamed");
  });

  it("returns null for corrupt stored data", async () => {
    const store = createMemoryStore();
    await store.set("resume:x", { schemaVersion: 2, education: "not a list" });
    const repo = createResumeRepository(store);
    expect(await repo.loadResume("x")).toBeNull();
  });

  it("raises a friendly error when storage is full", async () => {
    const full: KeyValueStore = {
      ...createMemoryStore(),
      async set() {
        const e = new Error("quota exceeded");
        e.name = "QuotaExceededError";
        throw e;
      },
    };
    const repo = createResumeRepository(full);
    await expect(repo.saveResume(getSampleResume())).rejects.toBeInstanceOf(StorageFullError);
  });
});

describe("undo/redo history", () => {
  it("undoes and redoes", () => {
    let h = createHistory(1);
    h = pushHistory(h, 2, { now: 0 });
    h = pushHistory(h, 3, { now: 5000 });
    expect(h.present).toBe(3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(h.present).toBe(2);
    h = pushHistory(h, 9, { now: 10000 });
    expect(h.future).toEqual([]);
    expect(redo(h)).toBe(h);
  });

  it("coalesces rapid edits to the same field", () => {
    let h = createHistory("");
    h = pushHistory(h, "H", { coalesceKey: "name", now: 0 });
    h = pushHistory(h, "Hi", { coalesceKey: "name", now: 300 });
    h = pushHistory(h, "Hi!", { coalesceKey: "name", now: 600 });
    expect(h.past).toEqual([""]);
    h = pushHistory(h, "Hi!x", { coalesceKey: "email", now: 700 });
    expect(h.past).toEqual(["", "Hi!"]);
    h = pushHistory(h, "late", { coalesceKey: "email", now: 5000 });
    expect(h.past).toHaveLength(3);
  });

  it("caps history length", () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) h = pushHistory(h, i, { now: i * 5000 });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe("JSON export/import", () => {
  it("round-trips all resumes", () => {
    const resumes = [getSampleResume(), createEmptyResume("Second")];
    const json = serializeBackup(resumes);
    const result = parseBackup(json);
    expect(result.errors).toEqual([]);
    expect(result.resumes).toEqual(resumes);
  });

  it("gives clashing ids new ids instead of overwriting", () => {
    const sample = getSampleResume();
    const result = parseBackup(serializeBackup([sample]), [sample.id]);
    expect(result.resumes[0].id).not.toBe(sample.id);
    expect(result.resumes[0].contact).toEqual(sample.contact);
  });

  it("imports a single resume object and reports bad entries", () => {
    expect(parseBackup(JSON.stringify(getSampleResume())).resumes).toHaveLength(1);
    const mixed = JSON.stringify({ resumes: [getSampleResume(), { schemaVersion: 2, name: 5 }] });
    const result = parseBackup(mixed);
    expect(result.resumes).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(parseBackup("not json").errors[0]).toMatch(/valid JSON/);
  });
});
