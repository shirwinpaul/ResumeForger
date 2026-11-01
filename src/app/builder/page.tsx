import type { Metadata } from "next";
import { GuidedBuilderWithAi } from "@/components/builder/GuidedBuilderWithAi";

export const metadata: Metadata = { title: "Guided builder — ResumeForge" };

export default function BuilderPage() {
  return <GuidedBuilderWithAi />;
}
