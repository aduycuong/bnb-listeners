import type { z } from "zod";

import type { ReportPeriod } from "@/lib/metrics/types";

import type { listMentionsQuerySchema } from "./schema";

export type MentionMatchType = "direct" | "context" | "manual";
export type MentionMatchTier = "lexical" | "llm" | "user";

/** One row of the Mentions list. */
export type MentionListItem = {
  id: string;
  contentItemId: string;
  rootItemId: string | null;
  kind: string;
  text: string;
  url: string | null;
  publishedAt: string | null;
  sourceName: string | null;
  authorName: string | null;
  rootText: string | null;
  matchType: MentionMatchType;
  matchTier: MentionMatchTier;
  matchedEntityIds: string[];
  matchedTerms: string[];
  matchReason: string | null;
  isRelevant: boolean;
  autoIsRelevant: boolean | null;
  userCorrected: boolean;
  /** The labeler's answer, when there is one. */
  label: boolean | null;
  /** Effective sentiment (label or Enrich) and Enrich's own. */
  sentiment: string | null;
  autoSentiment: string | null;
  emotion: string | null;
  enrichStatus: string;
  labelSentiment: string | null;
  /** Enrich's aspects. The effective ones are `labelAspectKeys` when not null (D14). */
  aspects: { aspectId: string; sentiment: string | null }[];
  labelAspectKeys: string[] | null;
  extractions: { schemaKey: string; data: Record<string, unknown> }[];
  /** Topic of the mention (D15); null when it has none. */
  topic: { id: string; name: string } | null;
};

export type ListMentionsParams = {
  projectId: string;
  /** Report period (D28); wins over `days`. Not part of the query string. */
  period?: ReportPeriod;
} & z.infer<typeof listMentionsQuerySchema>;

export type ListMentionsResult = {
  items: MentionListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/** One item of a thread with its mention state, for the thread panel. */
export type ThreadItem = {
  contentItemId: string;
  parentId: string | null;
  kind: string;
  text: string;
  url: string | null;
  publishedAt: string | null;
  authorName: string | null;
  mention: {
    id: string;
    matchType: MentionMatchType;
    matchTier: MentionMatchTier;
    matchedTerms: string[];
    matchReason: string | null;
    isRelevant: boolean;
    autoIsRelevant: boolean | null;
  } | null;
  label: boolean | null;
};

export type GetMentionThreadResult = {
  rootId: string;
  items: ThreadItem[];
};

export type SetItemLabelParams = {
  projectId: string;
  contentItemId: string;
  /** Null removes the label and returns the item to Match's decision. */
  isRelevant: boolean | null;
  userId: string;
  sampleId?: string;
  sentiment?: "positive" | "neutral" | "negative" | null;
  aspectKeys?: string[] | null;
};

export type SetItemLabelResult = {
  contentItemId: string;
  label: boolean | null;
  isRelevant: boolean | null;
  message: string;
};

export type LabelSampleStratum = "relevant" | "rejected" | "unmatched" | "enriched";
export type LabelSampleKind = "match" | "enrich";

export type LabelSampleSummary = {
  id: string;
  kind: LabelSampleKind;
  name: string;
  createdAt: string;
  size: number;
  labeled: number;
  strata: Record<string, { population: number; sampled: number }>;
  /** False when Match ran again with another config after sampling. */
  current: boolean;
};

export type ListLabelSamplesResult = { items: LabelSampleSummary[] };

export type CreateLabelSampleParams = {
  projectId: string;
  userId: string;
  kind: LabelSampleKind;
  mentions: number;
  unmatched: number;
};

/** An item to label, without Match's decision so the labeler is not led. */
export type LabelSampleTask = {
  sample: LabelSampleSummary;
  position: number;
  item: {
    contentItemId: string;
    kind: string;
    text: string;
    url: string | null;
    publishedAt: string | null;
    authorName: string | null;
    sourceName: string | null;
  } | null;
  /** Root post and the direct parent, for context. */
  root: { text: string; url: string | null } | null;
  parent: { text: string } | null;
  label: boolean | null;
  labelSentiment: string | null;
  labelAspectKeys: string[] | null;
};

export type MatchEvaluation = {
  sampleId: string;
  sampleName: string;
  current: boolean;
  labeled: number;
  strata: {
    stratum: LabelSampleStratum;
    population: number;
    sampled: number;
    labeled: number;
    labeledRelevant: number;
  }[];
  /** Share of Match's relevant mentions that labelers confirmed. */
  precision: number | null;
  /** Estimated share of truly relevant items Match found, weighted by stratum size. */
  recall: number | null;
  precisionByMatchType: { matchType: string; labeled: number; precision: number | null }[];
};

export type EnrichEvaluation = {
  sampleId: string;
  sampleName: string;
  /** Items labeled relevant with a sentiment, and enriched. */
  labeled: number;
  sentimentAccuracy: number | null;
  /** confusion[label][auto] counts. */
  confusion: Record<string, Record<string, number>>;
  aspect: { precision: number | null; recall: number | null; f1: number | null };
  byAspect: { key: string; name: string; support: number; precision: number | null; recall: number | null; f1: number | null }[];
};
