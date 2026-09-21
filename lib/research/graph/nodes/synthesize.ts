import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { MessageContent } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { formatFindings } from "../../utils/format-findings";
import type { ResearchGraphContext, ResearchStateType } from "../state";

const SYNTHESIZE_SYSTEM_PROMPT = [
  "You are a research analyst. Write a clear, visually rich, well-structured",
  "answer in free-form Markdown that directly addresses the research goal,",
  "grounded only in the provided evidence. Internal workspace evidence is the",
  "primary authority: base conclusions, recommendations, and examples on it.",
  "Use web evidence only to supplement, provide broader context, or clarify",
  "internal evidence; do not let it override or dilute relevant internal",
  "evidence. Analytics evidence (term statistics tables) is the authority for",
  "quantitative statements — volumes, trends, growth, rankings over time;",
  "quote its numbers precisely, keep or condense its table, and never infer",
  "counts from qualitative findings. Start with a short summary, then",
  "supporting sections.",
  "Prefer visual and structured presentation over text-only prose: preserve",
  "every relevant Markdown image already present in the evidence, placing it",
  "near the finding it supports. When an internal finding lists an image",
  "attachment with a URL, render it as Markdown image syntax",
  "`![descriptive alt text](url)` instead of dropping it or leaving it as plain",
  "text. Retain relevant tables, metrics, comparisons, and concise bullet lists",
  "when they make the evidence easier to scan. Do not invent, alter, or use",
  "image URLs that are not in the evidence; link relevant videos rather than",
  "claiming to embed them. Cite evidence inline using bracketed numbers like",
  "[1], [2] that match the numbered sources. Do not invent facts or sources.",
  "If the evidence is insufficient, say so and state any assumptions. Match the",
  "language of the research goal.",
].join(" ");

function extractText(content: MessageContent): string {
  if (typeof content === "string") return content;

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      return "";
    })
    .join("")
    .trim();
}

function buildSynthesizeUserMessage(
  state: ResearchStateType,
  context: string,
): string {
  return [
    `Research goal:\n${state.query}`,
    state.background ? `\nBackground:\n${state.background}` : "",
    `\nNumbered evidence:\n${context || "(no evidence found)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createSynthesizeNode(ctx: ResearchGraphContext) {
  return async (
    state: ResearchStateType,
  ): Promise<Partial<ResearchStateType>> => {
    const { context } = formatFindings(state.findings);

    if (state.findings.length === 0) {
      return {
        report:
          "No relevant information was found in the workspace knowledge base or web sources for this research goal.",
      };
    }

    const model = createChatModel(ctx.synthesizeModel, { temperature: 0.3 });
    const response = await model.invoke([
      new SystemMessage(SYNTHESIZE_SYSTEM_PROMPT),
      new HumanMessage(buildSynthesizeUserMessage(state, context)),
    ]);

    return { report: extractText(response.content) };
  };
}
