"use client";

import { useState } from "react";

import { DemoPanel } from "@/components/projects/demo/demo-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAquaCase, type AquaCase } from "@/lib/projects/aqua-demo";
import type { ProjectCase } from "@/lib/projects/project-cases";

const CHIPS = ["Vì sao tiêu cực tăng?", "Đề xuất hành động"];

const DEMO_NOTE =
  "(Bản demo: khi kết nối dữ liệu thật, AI trả lời dựa trên toàn bộ đề cập.)";

function sampleAnswer(question: string, demo: AquaCase | null) {
  if (!demo) return "";
  if (question.toLowerCase().includes("hành động")) {
    return demo.report.recs[0] ?? "";
  }
  const insight = demo.ai[1];
  return insight ? `${insight.headline} ${insight.body}` : "";
}

/** Static AI summary from the approved demo. Real answers come later. */
export function OverviewAiSummary({ projectCase }: { projectCase: ProjectCase }) {
  const demo = getAquaCase(projectCase);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;
    setQuestion(trimmed);
    setAnswer(sampleAnswer(trimmed, demo));
  }

  return (
    <DemoPanel title="AI tóm tắt" span="s4" scope="common" invert className="h-full">
      <ul className="flex flex-col gap-3">
        {demo?.ai.map((item) => (
          <li key={item.headline} className="flex gap-2.5 text-[13.5px] leading-[1.55]">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white/12 text-[13px]">
              {item.emoji}
            </span>
            <span>
              <b className="font-semibold text-white">{item.headline}</b> {item.body}
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-auto flex flex-col gap-2 pt-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 py-1 pr-1 pl-4">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Hỏi AI về dữ liệu này…"
            aria-label="Câu hỏi cho AI"
            className="h-8 border-0 bg-transparent px-0 text-[13px] text-white shadow-none placeholder:text-[#8FB2D6] focus-visible:border-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="h-8 rounded-full bg-[var(--sun)] px-3 text-[12.5px] font-semibold text-[#4D3400] shadow-none hover:bg-[var(--sun)]/90"
          >
            Hỏi
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <Button
              key={chip}
              type="button"
              variant="ghost"
              className="h-7 rounded-full bg-white/8 px-2.5 text-[12px] font-medium text-[#CFE3F7] hover:bg-white/12 hover:text-white"
              onClick={() => ask(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
        {answer || question ? (
          <p className="text-[12.5px] leading-relaxed text-[#CFE3F7]">
            {answer ? (
              <>
                <b className="text-white">Trả lời mẫu:</b> {answer}{" "}
              </>
            ) : null}
            <i>{DEMO_NOTE}</i>
          </p>
        ) : null}
      </form>
    </DemoPanel>
  );
}
