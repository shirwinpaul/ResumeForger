// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSampleResume } from "@/data/sample-resume";
import { createEmptyResume } from "@/lib/resume/schema";
import { createMemoryStore, createResumeRepository, type KeyValueStore } from "@/lib/resume/storage";

// A slow browser store holding an older active resume.
let releaseStore: () => void = () => {};
const memory: KeyValueStore = createMemoryStore();
vi.mock("@/lib/resume/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resume/storage")>();
  return {
    ...actual,
    getBrowserStore: () => new Promise<KeyValueStore>((resolve) => (releaseStore = () => resolve(memory))),
    getActiveResumeId: () => "old-resume",
    setActiveResumeId: () => {},
  };
});

const { ResumeStoreProvider, useResumeStore } = await import("@/hooks/useResumeStore");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ResumeStoreProvider", () => {
  it("keeps a resume the user opens before the stored one finishes loading", async () => {
    const old = { ...createEmptyResume("Old"), id: "old-resume" };
    await createResumeRepository(memory).saveResume(old);
    const sample = getSampleResume();

    let store: ReturnType<typeof useResumeStore> | null = null;
    function Probe() {
      const s = useResumeStore();
      useEffect(() => {
        store = s;
      });
      return null;
    }

    const root = createRoot(document.body.appendChild(document.createElement("div")));
    await act(async () => root.render(<ResumeStoreProvider><Probe /></ResumeStoreProvider>));

    // User clicks "Try with sample data" while storage is still loading…
    let opening: Promise<void> = Promise.resolve();
    await act(async () => {
      opening = store!.open(sample);
    });
    // …then the slow initial load resolves.
    await act(async () => {
      releaseStore();
      await opening;
    });

    expect(store!.resume?.id).toBe(sample.id);
    await act(async () => root.unmount());
  });
});
