import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { RESEARCH_FAST_MODEL, RESEARCH_MAX_CLARIFY_QUESTIONS } from "../config";
import { researchTriageSchema } from "../schema";
import type { TriageResearchParams, TriageResearchResult } from "../types";

const TRIAGE_SYSTEM_PROMPT = [
  "You are triaging a research request before it runs against a workspace's",
  "collected social-media data. Two checks, in order.",
  "",
  "1) Relevance. The workspace has a data-collection scope describing what it",
  "tracks. Set relevant=false only when the research goal clearly has nothing",
  "to do with that scope (a different industry, product domain, or subject",
  "entirely) — the workspace would hold no useful evidence for it. Treat",
  "adjacent, broader, or narrower topics as relevant. When irrelevant, give a",
  "one-sentence irrelevanceReason in the language of the goal.",
  "",
  "2) Clarity (only when relevant). Decide whether the goal and background are",
  "clear enough to research well. Only ask for clarification when a genuine",
  "ambiguity would materially change the research direction (e.g. undefined",
  "scope, conflicting interpretations, missing key entity). Prefer proceeding",
  "when reasonable assumptions can be made. When asking, keep questions short,",
  "specific, and answerable.",
].join(" ");

function buildTriageUserMessage(params: TriageResearchParams): string {
  return [
    `Workspace data-collection scope:\n${params.workspaceScope}`,
    `\nResearch goal:\n${params.query}`,
    params.background
      ? `\nBackground:\n${params.background}`
      : "\nBackground: (none provided)",
  ].join("\n");
}

/**
 * Synchronous triage (approach A). Always checks that the goal relates to the
 * workspace scope; irrelevant goals are rejected regardless of mode. Returns
 * clarifying questions only when the mode is `ask` and the request is
 * genuinely ambiguous; `assume` and `off` proceed without asking.
 */
export async function triageResearch(
  params: TriageResearchParams,
): Promise<TriageResearchResult> {
  const model = createChatModel(RESEARCH_FAST_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(researchTriageSchema);

  const result = await structured.invoke([
    new SystemMessage(TRIAGE_SYSTEM_PROMPT),
    new HumanMessage(buildTriageUserMessage(params)),
  ]);

  if (!result.relevant) {
    return {
      outcome: "out_of_scope",
      reason:
        result.irrelevanceReason.trim() ||
        "The research goal is unrelated to this workspace's data-collection scope.",
    };
  }

  if (params.mode !== "ask" || result.clear || result.questions.length === 0) {
    return { outcome: "proceed" };
  }

  return {
    outcome: "needs_clarification",
    questions: result.questions.slice(0, RESEARCH_MAX_CLARIFY_QUESTIONS),
  };
}
