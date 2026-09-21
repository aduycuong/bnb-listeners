import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { RESEARCH_FAST_MODEL, RESEARCH_MAX_CLARIFY_QUESTIONS } from "../config";
import { researchTriageSchema } from "../schema";
import type { TriageResearchParams, TriageResearchResult } from "../types";

const TRIAGE_SYSTEM_PROMPT = [
  "You are triaging a research request before it runs. Decide whether the goal",
  "and background are clear enough to research well. Only ask for clarification",
  "when a genuine ambiguity would materially change the research direction",
  "(e.g. undefined scope, conflicting interpretations, missing key entity).",
  "Prefer proceeding when reasonable assumptions can be made. When asking, keep",
  "questions short, specific, and answerable.",
].join(" ");

function buildTriageUserMessage(query: string, background: string): string {
  return [
    `Research goal:\n${query}`,
    background ? `\nBackground:\n${background}` : "\nBackground: (none provided)",
  ].join("\n");
}

/**
 * Synchronous clarify decision (approach A). Returns clarifying questions only
 * when the mode is `ask` and the request is genuinely ambiguous; `assume` and
 * `off` always proceed without asking.
 */
export async function triageResearch(
  params: TriageResearchParams,
): Promise<TriageResearchResult> {
  if (params.mode !== "ask") {
    return { needsClarification: false, questions: [] };
  }

  const model = createChatModel(RESEARCH_FAST_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(researchTriageSchema);

  const result = await structured.invoke([
    new SystemMessage(TRIAGE_SYSTEM_PROMPT),
    new HumanMessage(buildTriageUserMessage(params.query, params.background)),
  ]);

  if (result.clear || result.questions.length === 0) {
    return { needsClarification: false, questions: [] };
  }

  return {
    needsClarification: true,
    questions: result.questions.slice(0, RESEARCH_MAX_CLARIFY_QUESTIONS),
  };
}
