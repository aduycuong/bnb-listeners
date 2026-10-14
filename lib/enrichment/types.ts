import type { CaseExtraction } from "@/lib/projects/case-templates";

export type EnrichAspect = { id: string; key: string; name: string; description: string };

export type EnrichEntity = {
  id: string;
  /** Short key used in the prompt and output, e.g. `e1`. */
  ref: string;
  name: string;
  role: string;
  aliases: string[];
};

export type ProjectEnrichContext = {
  projectId: string;
  caseLabel: string;
  aspects: EnrichAspect[];
  entities: EnrichEntity[];
  extractions: CaseExtraction[];
  signature: string;
};

/** One mention to enrich, with the text of its item. */
export type EnrichItem = {
  mentionId: string;
  contentItemId: string;
  kind: string;
  text: string;
  contentHash: string;
};

export type EnrichThreadsResult = {
  enriched: number;
  failed: number;
  llmCalls: number;
};

export type PlanProjectEnrichResult = {
  signature: string;
  /** Root post ids of threads with mentions to enrich. */
  rootIds: string[];
  pending: number;
  skipped: number;
};

export type EnrichProjectWorkflowPayload = { projectId: string };
