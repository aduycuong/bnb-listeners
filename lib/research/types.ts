import type { ChatModelId } from "@/lib/langchain";

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

/**
 * A unified evidence item feeding the research graph — either an internal
 * workspace chunk or an external web result.
 */
export type Finding = {
  kind: "internal" | "web";
  /** Stable dedupe/citation key: `doc:{documentId}` (internal) or the URL (web). */
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
  kind: "internal" | "web";
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
      result: ResearchRunResult | null;
      error: string | null;
    };
