import type {
  ProposeTopicPromptSettings,
  ScoreRelevancePromptSettings,
} from "../constants";
import {
  DEFAULT_PROPOSE_TOPIC_SETTINGS,
  DEFAULT_SCORE_RELEVANCE_SETTINGS,
} from "../constants";
import { buildTopicLanguageGuideline } from "./topic-language-guideline";

const DEFAULT_SCORE_RELEVANCE_GUIDE = `Scoring guide:
  0  = Completely unrelated or spam
  3  = Loosely related or low substance
  5  = Somewhat relevant
  7  = Clearly relevant and useful
  10 = Highly relevant, substantive, and directly on-point`;

export function buildClassifyTopicsPrompt(): string {
  return `You are a topic classifier.

Given a document and a list of existing topics, select every existing topic that clearly applies.

Guidelines:
- Use only ids from the provided list for assignments — never invent ids.
- Assign one or more existing topics when the document is substantively about those subjects.
- Prefer specific topics over broad ones when both fit.
- Use confidence 0.9+ when the match is obvious, 0.6–0.8 when plausible but not central.
- Return an empty assignments array when no listed topic is a reasonable fit.`;
}

function formatExtraGuidelines(guidelines: string): string {
  const lines = guidelines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return `\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

export function buildProposeTopicPrompt(
  settings: ProposeTopicPromptSettings,
): string {
  const languageGuideline = buildTopicLanguageGuideline(settings.topicLanguage);

  return `You are a topic designer.

Propose one new topic that best describes the document's main subject. The topic should be specific enough to group similar future documents, but broad enough to be reusable.

Guidelines:
- Use clear, admin-friendly naming — not jargon or overly narrow labels.
- The description should help an admin decide whether to approve, merge, or reject the topic.
- ${languageGuideline}${formatExtraGuidelines(settings.guidelines)}`;
}

export function buildScoreRelevancePrompt(
  settings: ScoreRelevancePromptSettings,
): string {
  const domainDescription =
    settings.domainDescription.trim() ||
    DEFAULT_SCORE_RELEVANCE_SETTINGS.domainDescription;
  const scoringGuide = settings.scoringGuide.trim()
    ? `Scoring guide:\n${settings.scoringGuide.trim()}`
    : DEFAULT_SCORE_RELEVANCE_GUIDE;

  return `You are a content relevance evaluator.

Rate how relevant and valuable the following content is for ${domainDescription} on a scale of 0 to 10. Consider whether the content is substantive, on-topic, and worth indexing.

${scoringGuide}`;
}

export function normalizeProposeTopicSettings(
  settings: ProposeTopicPromptSettings,
): ProposeTopicPromptSettings {
  return {
    topicLanguage: settings.topicLanguage,
    guidelines: settings.guidelines.trim(),
  };
}

export function normalizeScoreRelevanceSettings(
  settings: ScoreRelevancePromptSettings,
): ScoreRelevancePromptSettings {
  return {
    domainDescription: settings.domainDescription.trim(),
    scoringGuide: settings.scoringGuide.trim(),
  };
}

export function isDefaultProposeTopicSettings(
  settings: ProposeTopicPromptSettings,
): boolean {
  const normalized = normalizeProposeTopicSettings(settings);
  const defaults = normalizeProposeTopicSettings({
    ...DEFAULT_PROPOSE_TOPIC_SETTINGS,
  });

  return (
    normalized.topicLanguage === defaults.topicLanguage &&
    normalized.guidelines === defaults.guidelines
  );
}

export function isDefaultScoreRelevanceSettings(
  settings: ScoreRelevancePromptSettings,
): boolean {
  const normalized = normalizeScoreRelevanceSettings(settings);
  const defaults = normalizeScoreRelevanceSettings({
    ...DEFAULT_SCORE_RELEVANCE_SETTINGS,
  });

  return (
    normalized.domainDescription === defaults.domainDescription &&
    normalized.scoringGuide === defaults.scoringGuide
  );
}

export function parseProposeTopicSettings(
  value: unknown,
): ProposeTopicPromptSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PROPOSE_TOPIC_SETTINGS };
  }

  const record = value as Partial<ProposeTopicPromptSettings>;
  const topicLanguage =
    record.topicLanguage === "vietnamese" ||
    record.topicLanguage === "english" ||
    record.topicLanguage === "auto"
      ? record.topicLanguage
      : DEFAULT_PROPOSE_TOPIC_SETTINGS.topicLanguage;

  return normalizeProposeTopicSettings({
    topicLanguage,
    guidelines:
      typeof record.guidelines === "string" ? record.guidelines : "",
  });
}

export function parseScoreRelevanceSettings(
  value: unknown,
): ScoreRelevancePromptSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SCORE_RELEVANCE_SETTINGS };
  }

  const record = value as Partial<ScoreRelevancePromptSettings>;

  return normalizeScoreRelevanceSettings({
    domainDescription:
      typeof record.domainDescription === "string"
        ? record.domainDescription
        : DEFAULT_SCORE_RELEVANCE_SETTINGS.domainDescription,
    scoringGuide:
      typeof record.scoringGuide === "string" ? record.scoringGuide : "",
  });
}
