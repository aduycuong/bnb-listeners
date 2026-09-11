import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import { buildTermLanguageGuideline } from "./term-language-guideline";

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

export function buildClassifyTermsPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a term classifier for: ${settings.dataCollectionScope}.

Given a document and a list of existing terms, select every existing term that clearly applies.

Guidelines:
- Stay within the workspace data collection scope: ${settings.dataCollectionScope}.
- Use only ids from the provided list for assignments — never invent ids.
- Assign one or more existing terms when the document is substantively about those subjects.
- Prefer specific terms over broad ones when both fit.
- Use confidence 0.9+ when the match is obvious, 0.6–0.8 when plausible but not central.
- Return an empty assignments array when no listed term is a reasonable fit.`;
}

export function buildProposeTopicPrompt(
  settings: WorkspaceLlmSettings,
): string {
  const languageGuideline = buildTermLanguageGuideline(settings.termLanguage);

  return `You are a term designer for: ${settings.dataCollectionScope}.

Propose one new term that best describes the document's main subject. The term should be specific enough to group similar future documents, but broad enough to be reusable.

Guidelines:
- Stay within the workspace data collection scope: ${settings.dataCollectionScope}.
- Use clear, admin-friendly naming — not jargon or overly narrow labels.
- The description should help an admin decide whether to approve, merge, or reject the term.
- ${languageGuideline}${formatTopicCriteria(settings.termCriteria)}`;
}

export function buildEvaluateTopicPrompt(
  settings: WorkspaceLlmSettings,
  term: { name: string; description: string | null },
): string {
  const description = term.description?.trim()
    ? `\nTerm description: ${term.description.trim()}`
    : "";

  return `You are a term relevance evaluator for: ${settings.dataCollectionScope}.

Decide whether each document substantively belongs to this single term:
- Term name: ${term.name.trim()}${description}

Guidelines:
- Stay within the workspace data collection scope: ${settings.dataCollectionScope}.
- Return match=true only when the document is clearly about this term's subject.
- Use confidence 0.9+ when the match is obvious, 0.7–0.85 when plausible but not central.
- Return match=false with low confidence when the document is unrelated or only tangentially related.
- Do not consider other terms — only whether this document fits the given term.`;
}

export function buildScoreRelevancePrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a content relevance evaluator for: ${settings.dataCollectionScope}.

Rate how relevant and valuable the following content is for that scope on a scale of 0 to 10. Consider whether the content is substantive, on-term, and worth indexing.

${DEFAULT_SCORE_RELEVANCE_GUIDE}`;
}

export function buildScoreCommentStancesPrompt(
  settings: WorkspaceLlmSettings,
): string {
  return `You are a comment classifier for: ${settings.dataCollectionScope}.

Given a social media post and a numbered list of comments on that post, classify each comment.

For every comment return:
- role:
  - "debate" — takes a position for or against the post's claim (argument, rebuttal, endorsement of a contested point).
  - "answer" — directly answers a question the post asked.
  - "info" — adds factual detail, experience, links, or clarification without mainly arguing or answering.
  - "other" — noise, jokes, pure acknowledgements, off-term, or unclear.
- stance: only when role is "debate". Use "agree", "disagree", or "neutral" relative to the post. For every other role return null.
- isSubstantive: true when the comment carries a real argument, answer, or useful information worth retrieving. false for emoji-only, tag-only, "hóng"/"quan tâm"/"ib"/"+1"/"đúng rồi" style acknowledgements, or empty chatter. Prefer false when role is "other".

Guidelines:
- Stay within the workspace data collection scope: ${settings.dataCollectionScope}.
- Judge role and stance relative to the post, not absolute sentiment.
- Short comments can still be substantive (e.g. "lừa đảo đấy" → debate/disagree, "khoảng 2 triệu" answering a price question → answer).
- If a comment both answers and argues, prefer the dominant intent; use "debate" when the main point is agreement/disagreement.
- Return exactly one result per input comment, using the same index numbers.`;
}
