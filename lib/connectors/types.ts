import type { z } from "zod";

import type { NormalizedContentItem, RawOrigin } from "@/lib/raw-store/types";

import type { ConnectorKey } from "./constants";

export type ConnectorContext = {
  collectRunId: string;
  sourceId: string | null;
};

/** Source details read from a payload, written back to `sources`. */
export type SourceDetails = {
  name?: string | null;
  followerCount?: number | null;
  memberCount?: number | null;
  metadata?: Record<string, unknown>;
};

export type NormalizeResult = {
  items: NormalizedContentItem[];
  /** Raw records dropped as invalid or as provider error rows. */
  skipped: number;
  source?: SourceDetails;
};

/** Another run to start once this one has been written, e.g. comments for refreshed posts. */
export type FollowUpRun = {
  connector: ConnectorKey;
  sourceId: string | null;
  params: Record<string, unknown>;
};

export type AfterNormalizeResult = {
  /** Merged into `collect_runs.stats`. */
  stats?: Record<string, unknown>;
  followUps?: FollowUpRun[];
};

type ConnectorBase<TParams> = {
  key: ConnectorKey;
  platform: string;
  /** Written to `content_items.origin` and `authors.origin`. Defaults to `connector`. */
  origin?: RawOrigin;
  paramsSchema: z.ZodType<TParams>;
  /** `skip` leaves items already in the raw store untouched. Defaults to `update`. */
  onExisting?: "update" | "skip";
  /** Pure mapping from raw payload records to raw-store items. */
  normalize(records: unknown[], params: TParams): NormalizeResult;
  /**
   * Runs once after the whole payload is written. Items written by this run
   * carry its `collect_run_id`. Must be safe to retry.
   */
  afterNormalize?(
    context: ConnectorContext,
    params: TParams,
  ): Promise<AfterNormalizeResult>;
};

/**
 * Provider runs the collection asynchronously (Bright Data) and delivers the
 * result to a webhook; the workflow starts the job and waits for that delivery.
 */
export type JobConnector<TParams> = ConnectorBase<TParams> & {
  mode: "job";
  /** Starts the provider job and returns its id. */
  startJob(params: TParams, context: ConnectorContext): Promise<string>;
};

/** What a direct fetch hands back: the records, and numbers worth keeping on the run. */
export type DirectFetchResult = {
  records: unknown[];
  /** Written to `collect_runs.stats` when the fetch ends and merged into the final stats. */
  stats?: Record<string, unknown>;
};

/** Collection returns records directly (synthetic and simple HTTP connectors). */
export type DirectConnector<TParams> = ConnectorBase<TParams> & {
  mode: "direct";
  fetchRecords(
    params: TParams,
    context: ConnectorContext,
  ): Promise<unknown[] | DirectFetchResult>;
};

export type Connector<TParams = Record<string, unknown>> =
  | JobConnector<TParams>
  | DirectConnector<TParams>;

export type CreateCollectRunParams = {
  connector: ConnectorKey;
  sourceId: string | null;
  params: Record<string, unknown>;
  /** Seconds before the workflow starts. */
  delaySeconds?: number;
};

export type CreateCollectRunResult = {
  collectRunId: string;
  workflowRunId: string;
};

export type BackfillSourceParams = {
  /** Source id or its exact URL. */
  source: string;
  /** Start of the gap (ISO). */
  from: string;
  /** End of the gap (ISO); defaults to the oldest stored post plus the overlap. */
  to?: string;
  maxRecords?: number;
  /** Days of one TikTok run; Facebook always runs the whole range at once. */
  windowDays?: number;
};

export type BackfillPlan = {
  sourceId: string;
  platform: string;
  url: string | null;
  connector: "facebook-posts" | "tiktok-posts";
  from: Date;
  to: Date;
  /** True when `to` came from the oldest stored post, not from the caller. */
  toFromStoredPosts: boolean;
  windows: { since: Date; until: Date }[];
  /** Posts already stored inside `[from, to]`; they are skipped, not updated. */
  existingPosts: number;
};

export type BackfillSourceResult = BackfillPlan & {
  runs: (CreateCollectRunResult & { since: string; until: string })[];
};

export type CollectSourceWorkflowPayload = {
  collectRunId: string;
};

export type StartCollectRunResult =
  | { state: "skipped"; reason: string }
  | { state: "job-started"; externalJobId: string }
  | { state: "stored"; payloadKey: string; itemCount: number };

export type NormalizeCollectRunBatchParams = {
  collectRunId: string;
  payloadKey: string;
  offset: number;
  limit: number;
};

/** Kept small on purpose: step results are stored in QStash. */
export type NormalizeCollectRunBatchResult = {
  inserted: number;
  updated: number;
  /** Raw records dropped as invalid, plus existing items left untouched. */
  skipped: number;
};

export type CollectRunStats = {
  inserted: number;
  updated: number;
  skipped: number;
} & Record<string, unknown>;

export type StoreRawPayloadParams = {
  collectRunId: string;
  body: string;
};

export type StoreRawPayloadResult = {
  payloadKey: string;
  itemCount: number;
};
