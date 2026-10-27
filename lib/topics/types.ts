import type { z } from "zod";

import type { TopicStageKind, TopicStatus } from "./config";
import type { listTopicsQuerySchema, updateTopicBodySchema } from "./schema";

export type TopicProjectWorkflowPayload = { projectId: string; kind?: TopicStageKind };

export type TopicRunParams = { projectId: string; kind?: TopicStageKind };

export type EmbedTopicHintsResult = {
  embedded: number;
  /** More mentions are waiting to be embedded. */
  more: boolean;
};

export type AssignTopicsResult = {
  llmCalls: number;
  /** Mentions put into a topic, and those left waiting, in this call. */
  assigned: number;
  waiting: number;
  created: { id: string; name: string; mentions: number }[];
  /** More pending mentions remain for another call. */
  more: boolean;
};

export type MergeSimilarTopicsResult = {
  checked: number;
  merged: { sourceId: string; targetId: string }[];
  llmCalls: number;
};

/** One topic of the Topics list. */
export type TopicListItem = {
  id: string;
  name: string;
  description: string;
  aspectId: string | null;
  status: TopicStatus;
  mentionCount: number;
  sentiments: { positive: number; neutral: number; negative: number };
  /** Relevant mentions published in the last 7 days and the 7 days before. */
  last7Days: number;
  previous7Days: number;
  /** Most frequent hints, for a quick look at what the topic holds. */
  sampleHints: string[];
  createdAt: string;
};

export type ListTopicsParams = { projectId: string } & z.infer<typeof listTopicsQuerySchema>;

export type ListTopicsResult = {
  items: TopicListItem[];
  /** Relevant mentions with a hint still waiting for a topic, and those not handled yet. */
  waiting: number;
  pending: number;
};

export type UpdateTopicParams = { projectId: string; topicId: string } & z.infer<
  typeof updateTopicBodySchema
>;

export type MergeTopicsParams = { projectId: string; sourceId: string; targetId: string };

export type TopicSummary = { id: string; name: string; status: TopicStatus };
