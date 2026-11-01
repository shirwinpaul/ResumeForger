import type { Metadata } from "next";
import { StartScreen } from "@/components/start/StartScreen";

export const metadata: Metadata = { title: "My resumes — ResumeForge" };

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const { mode } = await searchParams;
  return <StartScreen mode={typeof mode === "string" ? mode : undefined} />;
}
