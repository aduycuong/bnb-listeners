import type { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

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

/** Another run to start once this one has been written, e.g. comments for new posts. */
export type FollowUpRun = {
  connector: ConnectorKey;
  params: Record<string, unknown>;
};

type ConnectorBase<TParams> = {
  key: ConnectorKey;
  platform: string;
  paramsSchema: z.ZodType<TParams>;
  /** Pure mapping from raw payload records to raw-store items. */
  normalize(records: unknown[], params: TParams): NormalizeResult;
  /** Called after each written batch, with the items that batch touched. */
  planFollowUps?(
    written: WrittenItemSummary[],
    params: TParams,
  ): FollowUpRun[];
};

export type WrittenItemSummary = {
  externalId: string;
  kind: string;
  url: string | null;
  outcome: "inserted" | "updated";
  commentCount: number;
  previousCommentCount: number | null;
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

/** Collection returns records directly (synthetic and simple HTTP connectors). */
export type DirectConnector<TParams> = ConnectorBase<TParams> & {
  mode: "direct";
  fetchRecords(params: TParams, context: ConnectorContext): Promise<unknown[]>;
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
  skipped: number;
  followUps: FollowUpRun[];
};

export type StoreRawPayloadParams = {
  collectRunId: string;
  body: string;
};

export type StoreRawPayloadResult = {
  payloadKey: string;
  itemCount: number;
};
