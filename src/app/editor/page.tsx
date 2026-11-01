import type { Metadata } from "next";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

export const metadata: Metadata = { title: "Editor — ResumeForge" };

export default function EditorPage() {
  return <EditorWorkspace />;
}
