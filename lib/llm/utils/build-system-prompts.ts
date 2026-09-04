import type { TopicLanguage } from "@/lib/workspaces/constants";
import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

function topicLanguageGuideline(language: TopicLanguage): string {
  switch (language) {
    case "vietnamese":
      return "Write proposed topic names and descriptions in Vietnamese.";
    case "english":
      return "Write proposed topic names and descriptions in English.";
    case "auto":
      return "Write proposed topic names and descriptions in the same language as the document.";
  }
}

export function buildClassifyTopicsSystemPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a topic classifier for: ${settings.topicScope}.

Given a document and a list of existing topics, select every existing topic that clearly applies.

Guidelines:
- Stay within the workspace topic scope: ${settings.topicScope}.
- Use only ids from the provided list for assignments — never invent ids.
- Assign one or more existing topics when the document is substantively about those subjects.
- Prefer specific topics over broad parent topics when both fit.
- Use confidence 0.9+ when the match is obvious, 0.6–0.8 when plausible but not central.
- Return an empty assignments array when no listed topic is a reasonable fit.`;
}

export function buildProposeTopicSystemPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a topic designer for: ${settings.topicScope}.

Propose one new topic that best describes the document's main subject. The topic should be specific enough to group similar future documents, but broad enough to be reusable.

Guidelines:
- Stay within the workspace topic scope: ${settings.topicScope}.
- Use clear, admin-friendly naming — not jargon or overly narrow labels.
- The description should help an admin decide whether to approve, merge, or reject the topic.
- ${topicLanguageGuideline(settings.topicLanguage)}`;
}

export function buildScoreRelevanceSystemPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a content relevance evaluator for: ${settings.topicScope}.

Rate how relevant the following content is to that domain on a scale of 0 to 10.

Scoring guide:
  0  = Completely unrelated
  3  = Loosely related
  5  = Somewhat relevant
  7  = Clearly relevant
  10 = Highly relevant and directly about the domain`;
}
