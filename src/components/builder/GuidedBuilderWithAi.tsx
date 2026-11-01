"use client";

import { BulletTools, TurnIntoBulletsButton } from "@/components/ai/BulletTools";
import { SkillsSuggester, SummaryWriter } from "@/components/ai/SectionTools";
import { BulletToolsContext, type BulletToolsTarget } from "@/components/editor/ItemEditor";
import { useResumeStore } from "@/hooks/useResumeStore";
import { GuidedBuilder } from "./GuidedBuilder";

const renderBulletTools = (t: BulletToolsTarget) => <BulletTools target={t} />;

/** The guided builder with its AI slots filled in. */
export function GuidedBuilderWithAi() {
  const { resume } = useResumeStore();
  return (
    <BulletToolsContext.Provider value={renderBulletTools}>
      <GuidedBuilder
        ai={{
          turnIntoBullets: (section) =>
            function AiSlot({ text, propose }) {
              return <TurnIntoBulletsButton section={section} text={text} propose={propose} />;
            },
          summaryTool: resume ? <SummaryWriter resume={resume} /> : null,
          skillsTool: resume ? <SkillsSuggester resume={resume} /> : null,
        }}
      />
    </BulletToolsContext.Provider>
  );
}
