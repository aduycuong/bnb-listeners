import type { z } from "zod";

import type { ChatModelId } from "@/lib/langchain";

import type { RESEARCH_TERM_PERIODS } from "./config";
import type { researchTaskSchema } from "./schema";

/** Semantic effort knob controlling loop limits and synthesis model. */
export type DepthLevel = "quick" | "standard" | "deep";

/** How the endpoint handles ambiguous requests before enqueueing. */
export type ClarificationMode = "ask" | "assume" | "off";

export type DepthConfig = {
  maxIterations: number;
  maxSubQueries: number;
  synthesizeModel: ChatModelId;
};

/** A single answered clarifying question, treated as extra background. */
export type Clarification = {
  question: string;
  answer: string;
};

/** Relative period preset accepted by `term_analytics` tasks. */
export type ResearchTermPeriod = (typeof RESEARCH_TERM_PERIODS)[number];

/**
 * One evidence-gathering task produced by the plan/evaluate nodes and
 * dispatched by the gather node to the matching source runner.
 */
export type ResearchTask = z.infer<typeof researchTaskSchema>;

export type ResearchTaskKind = ResearchTask["kind"];

/** Where a finding came from; drives citation labels and prompt guidance. */
export type FindingKind = "internal" | "web" | "analytics";

/**
 * A unified evidence item feeding the research graph — an internal workspace
 * chunk, an external web result, or a computed analytics snapshot.
 */
export type Finding = {
  kind: FindingKind;
  /**
   * Stable dedupe/citation key: `doc:{documentId}` (internal), the URL (web),
   * or `analytics:{...}` (analytics).
   */
  ref: string;
  title: string;
  content: string;
  docType?: string;
  publishedAt: string | null;
};

/** A media part attached to a post's text finding. */
export type FindingAttachment = {
  type: "image" | "video";
  summary: string | null;
  url: string | null;
};

/** A numbered citation surfaced with the final report. */
export type ResearchSource = {
  index: number;
  kind: FindingKind;
  ref: string;
  title: string;
  docType?: string;
  publishedAt: string | null;
};

/** Persisted result payload stored on a succeeded run. */
export type ResearchRunResult = {
  report: string;
  sources: ResearchSource[];
  iterations: number;
  findingCount: number;
};

export type ResearchStatus = "pending" | "running" | "succeeded" | "failed";

// --- Service params / results -------------------------------------------------

export type StartResearchParams = {
  workspaceId: string;
  userId?: string;
  /** When false, return `{ status: "started", jobId }` immediately after enqueue. */
  waitForResult?: boolean;
  query: string;
  context?: string;
  clarifications?: Clarification[];
  clarificationMode?: ClarificationMode;
  depth?: DepthLevel;
};

export type StartResearchResult =
  | { status: "needs_clarification"; questions: string[] }
  | { status: "started"; jobId: string }
  | {
      status: "completed";
      jobId: string;
      report: string;
      sources: ResearchSource[];
    };

export type TriageResearchParams = {
  query: string;
  background: string;
  mode: ClarificationMode;
};

export type TriageResearchResult = {
  needsClarification: boolean;
  questions: string[];
};

export type GetResearchRunParams = {
  workspaceId: string;
  runId: string;
};

export type GetResearchRunResult =
  | { found: false }
  | {
      found: true;
      status: ResearchStatus;
      query: string;
      context: string | null;
      clarificationMode: ClarificationMode;
      background: string | null;
      depth: DepthLevel;
      result: ResearchRunResult | null;
      error: string | null;
      createdAt: string;
      updatedAt: string;
      finishedAt: string | null;
    };

export type ResearchRunListItem = {
  id: string;
  query: string;
  status: ResearchStatus;
  depth: DepthLevel;
  createdAt: string;
  finishedAt: string | null;
  findingCount: number | null;
};

export type ListResearchRunsResult = {
  items: ResearchRunListItem[];
};

export type StartResearchBody = Omit<StartResearchParams, "workspaceId" | "userId">;

export type DeleteResearchRunParams = {
  runId: string;
};

export type DeleteResearchRunResult = {
  id: string;
  message: string;
};
