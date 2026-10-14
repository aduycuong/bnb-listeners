import type { CompiledQuery } from "./utils/compile-query";

export type MatchEntity = {
  id: string;
  role: string;
  name: string;
  aliases: string[];
  /** Terms and exclusions; part of the tier 2 cache key. */
  terms: string[];
  exclude: string[];
};

export type ProjectMatchContext = {
  projectId: string;
  workspaceId: string;
  caseLabel: string;
  sourceIds: string[];
  queries: CompiledQuery[];
  entities: Map<string, MatchEntity>;
  /** Hash of query ids + versions and source ids. */
  signature: string;
  storedSignature: string | null;
};

/** The columns of `content_items` Match reads. */
export type MatchItem = {
  id: string;
  kind: string;
  rootId: string | null;
  text: string;
  contentHash: string;
  platform: string;
  sourceId: string | null;
  authorId: string | null;
  publishedAt: Date | null;
  origin: string;
  collectRunId: string | null;
};

export type MatchLexicalResult = {
  signature: string;
  /** Signature of the last full match; incremental runs need it to equal `signature`. */
  storedSignature: string | null;
  /** Root post ids whose threads need tier 2. */
  pendingRootIds: string[];
  stats: { items: number; direct: number; pendingItems: number };
};

export type JudgeThreadsResult = {
  judged: number;
  cached: number;
  llmCalls: number;
  relevant: number;
};

export type MatchProjectWorkflowPayload = {
  projectId: string;
  /** Set for incremental runs after a collect run; omitted for a full match. */
  collectRunId?: string;
};

export type PreviewEntityInput = {
  /** Client entity id; echoed back. */
  id: string;
  name: string;
  aliases: string[];
  ambiguousAliases: string[];
  withTerms: string[];
  exclude: string[];
};

export type PreviewMatchesParams = {
  sourceIds: string[];
  entities: PreviewEntityInput[];
};

export type PreviewSample = {
  kind: string;
  text: string;
  terms: string[];
  needsConfirmation: boolean;
  publishedAt: string | null;
};

export type PreviewMatchesResult = {
  days: number;
  scanned: number;
  entities: {
    id: string;
    posts: number;
    comments: number;
    /** Direct hits that tier 2 will confirm. */
    needsConfirmation: number;
    /** Comments under matching posts that do not name the entity; tier 2 decides. */
    contextComments: number;
    samples: PreviewSample[];
  }[];
};
