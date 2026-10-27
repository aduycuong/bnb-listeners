import type { z } from "zod";
import type { BatchItem } from "drizzle-orm/batch";

import type { EnricherKey } from "./registry";

export type EnrichAspect = { id: string; key: string; name: string; description: string };

export type EnrichEntity = {
  id: string;
  /** Short key used in the prompt and output, e.g. `e1`. */
  ref: string;
  name: string;
  /** Key of `ENTITY_ROLES`. */
  role: string;
  /** The role's label in the case template, shown in the prompt. */
  roleLabel: string;
  aliases: string[];
};

/** One enabled enricher of a project with its current signature. */
export type ProjectEnricherState = {
  key: EnricherKey;
  config: Record<string, unknown>;
  signature: string;
};

export type ProjectEnrichContext = {
  projectId: string;
  workspaceId: string;
  caseLabel: string;
  caseVersion: number;
  aspects: EnrichAspect[];
  entities: EnrichEntity[];
  /** Enabled, ready enrichers of the project (LLM and stages). */
  enrichers: ProjectEnricherState[];
};

/** One mention to enrich, with the text of its item and the LLM keys it needs. */
export type EnrichItem = {
  mentionId: string;
  contentItemId: string;
  kind: string;
  text: string;
  contentHash: string;
  publishedAt: Date | null;
  /** Entities Match linked the mention to; entities from Enrich must be among them. */
  matchedEntityIds: string[];
  keys: EnricherKey[];
};

/**
 * Server-side implementation of an LLM enricher: what it adds to the shared
 * call and how it writes its result for one mention.
 */
export type LlmEnricher = {
  key: EnricherKey;
  /** Context the prompt must list for this enricher. */
  needsEntities?: boolean;
  needsAspects?: boolean;
  /** Project config this enricher depends on, hashed into its signature with version and model. */
  signatureInput(ctx: ProjectEnrichContext): unknown;
  /** Fields added to each item of the structured output. */
  schemaFields(ctx: ProjectEnrichContext): Record<string, z.ZodType>;
  /** Instructions appended to the system prompt. */
  promptLines(ctx: ProjectEnrichContext): string[];
  /** Rows that replace this enricher's output for one mention. */
  writes(ctx: ProjectEnrichContext, item: EnrichItem, result: Record<string, unknown>): BatchItem<"pg">[];
};

export type EnrichThreadsResult = {
  enriched: number;
  failed: number;
  llmCalls: number;
};

export type PlanProjectEnrichResult = {
  /** Root post ids of threads with mentions to enrich. */
  rootIds: string[];
  /** (mention, key) pairs to run. */
  pending: number;
  pendingByKey: Record<string, number>;
  /** Enabled LLM keys taking part in this run. */
  keys: EnricherKey[];
};

export type IndexTermsResult = {
  indexed: number;
  /** More mentions are waiting to be indexed. */
  more: boolean;
};

export type EnrichRunOptions = {
  /** Only these enrichers (and the stages that depend on them); all enabled ones otherwise. */
  only?: EnricherKey[];
  /** Run again even when nothing changed. */
  force?: boolean;
};

export type EnrichProjectWorkflowPayload = { projectId: string } & EnrichRunOptions;
