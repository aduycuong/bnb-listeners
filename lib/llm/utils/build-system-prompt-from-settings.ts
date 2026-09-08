import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import { buildTopicLanguageGuideline } from "./topic-language-guideline";

const DEFAULT_SCORE_RELEVANCE_GUIDE = `Scoring guide:
  0  = Completely unrelated or spam
  3  = Loosely related or low substance
  5  = Somewhat relevant
  7  = Clearly relevant and useful
  10 = Highly relevant, substantive, and directly on-point`;

function formatTopicCriteria(criteria: string): string {
  const lines = criteria
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return `\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function buildClassifyTopicsPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a topic classifier for: ${settings.dataCollectionScope}.

Given a document and a list of existing topics, select every existing topic that clearly applies.

Guidelines:
- Stay within the workspace data collection scope: ${settings.dataCollectionScope}.
- Use only ids from the provided list for assignments — never invent ids.
- Assign one or more existing topics when the document is substantively about those subjects.
- Prefer specific topics over broad ones when both fit.
- Use confidence 0.9+ when the match is obvious, 0.6–0.8 when plausible but not central.
- Return an empty assignments array when no listed topic is a reasonable fit.`;
}

export function buildProposeTopicPrompt(
  settings: WorkspaceLlmSettings,
): string {
  const languageGuideline = buildTopicLanguageGuideline(settings.topicLanguage);

  return `You are a topic designer for: ${settings.dataCollectionScope}.

Propose one new topic that best describes the document's main subject. The topic should be specific enough to group similar future documents, but broad enough to be reusable.

Guidelines:
- Stay within the workspace data collection scope: ${settings.dataCollectionScope}.
- Use clear, admin-friendly naming — not jargon or overly narrow labels.
- The description should help an admin decide whether to approve, merge, or reject the topic.
- ${languageGuideline}${formatTopicCriteria(settings.topicCriteria)}`;
}

export function buildScoreRelevancePrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a content relevance evaluator for: ${settings.dataCollectionScope}.

Rate how relevant and valuable the following content is for that scope on a scale of 0 to 10. Consider whether the content is substantive, on-topic, and worth indexing.

${DEFAULT_SCORE_RELEVANCE_GUIDE}`;
}
