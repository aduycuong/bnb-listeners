export const TOPIC_LANGUAGES = ["vietnamese", "english", "auto"] as const;

export type TopicLanguage = (typeof TOPIC_LANGUAGES)[number];

export const DEFAULT_TOPIC_LANGUAGE: TopicLanguage = "auto";

export const TOPIC_LANGUAGE_OPTIONS: {
  value: TopicLanguage;
  label: string;
  description: string;
}[] = [
  {
    value: "vietnamese",
    label: "Vietnamese",
    description: "Always generate topic names and descriptions in Vietnamese.",
  },
  {
    value: "english",
    label: "English",
    description: "Always generate topic names and descriptions in English.",
  },
  {
    value: "auto",
    label: "Auto",
    description: "Match the language of the document being classified.",
  },
];

export const LLM_PROMPT_KEYS = [
  "classify_topics",
  "propose_topic",
  "score_relevance",
] as const;

export type LlmPromptKey = (typeof LLM_PROMPT_KEYS)[number];

/** Prompts editable from the LLM settings page. */
export const EDITABLE_LLM_PROMPT_KEYS = [
  "propose_topic",
  "score_relevance",
] as const;

export type EditableLlmPromptKey = (typeof EDITABLE_LLM_PROMPT_KEYS)[number];

export const MAX_LLM_GUIDELINES_LENGTH = 2_000;
export const MAX_LLM_DOMAIN_DESCRIPTION_LENGTH = 500;
export const MAX_LLM_SCORING_GUIDE_LENGTH = 2_000;

export type ProposeTopicPromptSettings = {
  topicLanguage: TopicLanguage;
  /** Extra guidelines appended as bullet points (one per line). */
  guidelines: string;
};

export type ScoreRelevancePromptSettings = {
  /** What the content is being scored for relevance against. */
  domainDescription: string;
  /** Optional multiline scoring guide. Empty uses the built-in default guide. */
  scoringGuide: string;
};

export type LlmPromptSettingsMap = {
  classify_topics: Record<string, never>;
  propose_topic: ProposeTopicPromptSettings;
  score_relevance: ScoreRelevancePromptSettings;
};

export type WorkspaceLlmPromptSettings =
  | ProposeTopicPromptSettings
  | ScoreRelevancePromptSettings;

export const DEFAULT_PROPOSE_TOPIC_SETTINGS: ProposeTopicPromptSettings = {
  topicLanguage: "auto",
  guidelines: "",
};

export const DEFAULT_SCORE_RELEVANCE_SETTINGS: ScoreRelevancePromptSettings = {
  domainDescription: "a curated knowledge workspace",
  scoringGuide: "",
};

export const LLM_PROMPT_DEFINITIONS = {
  propose_topic: {
    label: "Propose topic",
    description:
      "Proposes a new topic when no existing topic matches a document.",
  },
  score_relevance: {
    label: "Score relevance",
    description:
      "Scores document relevance during quality scoring before chunking.",
  },
} as const;
