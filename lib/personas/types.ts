import type { PersonaKindValue } from "./schema";

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const LENGTHS = ["short", "medium", "long"] as const;
export type TextLength = (typeof LENGTHS)[number];

/**
 * How much an item is about the brief: `direct` reacts to the event itself,
 * `related` touches it in passing, `general` talks about the project or topic
 * without mentioning the event.
 */
export const BRIEF_RELEVANCES = ["direct", "related", "general"] as const;
export type BriefRelevance = (typeof BRIEF_RELEVANCES)[number];

/** Not written by a panel persona through the LLM. */
export type NoiseKind = "spam" | "off-topic" | "distractor";

export type SyntheticItemKind = "post" | "comment" | "reply";

/** Persona fields the generator needs; keeps prompts small. */
export type PersonaSnapshot = {
  id: string;
  templateKey: string | null;
  name: string;
  kind: PersonaKindValue;
  description: string;
  tone: string;
  concerns: string[];
};

export type PanelMember = {
  persona: PersonaSnapshot;
  weight: number;
};

export type PlannedAuthor = {
  externalId: string;
  name: string;
  /** Null for noise authors that belong to no persona. */
  personaId: string | null;
  followerCount: number;
};

export type PlannedItem = {
  /** 0 is the post; replies come after their comment. */
  index: number;
  kind: SyntheticItemKind;
  parentIndex: number | null;
  persona: PersonaSnapshot | null;
  /** Filled by author assignment. */
  author: PlannedAuthor | null;
  /** True when this item must be written by the post author. */
  byPostAuthor: boolean;
  publishedAt: Date;
  sentiment: Sentiment;
  aspect: string | null;
  length: TextLength;
  briefRelevance: BriefRelevance;
  noise: NoiseKind | null;
};

export type PlannedThread = {
  index: number;
  items: PlannedItem[];
};

export type SourceStyleSample = {
  text: string;
};
