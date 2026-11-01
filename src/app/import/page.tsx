import type { Metadata } from "next";
import { ImportFlow } from "@/components/import/ImportFlow";

export const metadata: Metadata = { title: "Import a resume — ResumeForge" };

export default function ImportPage() {
  return <ImportFlow />;
}
