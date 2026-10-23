import type { ContentItemMedia } from "@/db/schema";
import type { ActivityTier, CollectRunStatus, ConnectorKey } from "@/lib/connectors/constants";

export type PageParams = {
  page?: number;
  pageSize?: number;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type SourceRef = {
  id: string;
  name: string | null;
};

// --- Overview ---------------------------------------------------------------

export type AdminOverview = {
  sources: {
    total: number;
    byTier: Record<string, number>;
  };
  contentItems: {
    total: number;
    byKind: Record<string, number>;
    byOrigin: Record<string, number>;
    firstSeenLast24h: number;
  };
  collectRuns: {
    active: number;
    last24hByConnector: {
      connector: string;
      status: string;
      count: number;
      items: number;
    }[];
  };
  usage: {
    monthStart: string;
    recordsThisMonth: number;
    byConnector: Record<string, number>;
  };
  refreshSchedules: {
    total: number;
    overdue: number;
  };
};

// --- Sources ----------------------------------------------------------------

export type AdminSourceRow = {
  id: string;
  platform: string;
  sourceType: string;
  name: string | null;
  url: string | null;
  activityTier: ActivityTier;
  activityTierLocked: boolean;
  monthlyRecordLimit: number | null;
  origin: string;
  lastCollectedAt: string | null;
  posts: number;
  comments: number;
  /** Posts per day over `COLLECT_CONFIG.tiers.windowDays`. */
  postsPerDay: number;
  usedThisMonth: number;
  lastPostRun: {
    id: string;
    status: CollectRunStatus;
    createdAt: string;
  } | null;
  /** Last post run + tier interval; null when the scheduler skips the source. */
  nextPostRunAt: string | null;
};

export type AdminSourceDetail = AdminSourceRow & {
  externalId: string;
  followerCount: number | null;
  memberCount: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pendingRefreshes: number;
};

// --- Content items ----------------------------------------------------------

export type ListAdminContentItemsParams = PageParams & {
  sourceId?: string;
  kind?: string;
  origin?: string;
  collectRunId?: string;
  q?: string;
};

export type AdminContentItemRow = {
  id: string;
  kind: string;
  platform: string;
  source: SourceRef | null;
  authorName: string | null;
  text: string;
  url: string | null;
  publishedAt: string | null;
  firstSeenAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  origin: string;
  rootId: string | null;
};

export type AdminContentItemDetail = {
  item: AdminContentItemRow & {
    externalId: string;
    parentId: string | null;
    language: string | null;
    viewCount: number;
    reactions: Record<string, number> | null;
    media: ContentItemMedia[];
    contentHash: string;
    lastCollectedAt: string;
    collectRunId: string | null;
    metadata: Record<string, unknown>;
    author: {
      id: string;
      name: string | null;
      url: string | null;
      externalId: string;
    } | null;
  };
  /** Comments and replies of a post (by `root_id`), oldest first. */
  thread: AdminContentItemRow[];
  threadTotal: number;
  snapshots: {
    capturedAt: string;
    collectRunId: string | null;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    viewCount: number;
  }[];
  refreshSchedule: {
    nextRefreshAt: string;
    checkpointHours: number;
    commentsCollectedCount: number | null;
    commentsCollectedAt: string | null;
  } | null;
};

// --- Collect runs -----------------------------------------------------------

export type ListAdminCollectRunsParams = PageParams & {
  sourceId?: string;
  connector?: string;
  status?: string;
};

export type AdminCollectRunRow = {
  id: string;
  connector: ConnectorKey;
  source: SourceRef | null;
  status: CollectRunStatus;
  itemCount: number | null;
  stats: Record<string, unknown> | null;
  error: string | null;
  hasPayload: boolean;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type AdminCollectRunDetail = AdminCollectRunRow & {
  params: Record<string, unknown>;
  workflowRunId: string | null;
  externalJobId: string | null;
  payloadKey: string | null;
  /** Content items whose latest write came from this run. */
  contentItems: number;
};

export type GetCollectRunPayloadParams = {
  id: string;
  offset?: number;
  limit?: number;
};

export type CollectRunPayload = {
  payloadKey: string;
  sizeBytes: number;
  total: number;
  offset: number;
  records: unknown[];
};

// --- Refresh schedules ------------------------------------------------------

export type ListAdminRefreshSchedulesParams = PageParams & {
  sourceId?: string;
  /** overdue: `next_refresh_at` passed; upcoming: still ahead. */
  due?: "overdue" | "upcoming";
};

export type AdminRefreshScheduleRow = {
  contentItemId: string;
  source: SourceRef | null;
  text: string;
  url: string | null;
  publishedAt: string | null;
  commentCount: number;
  nextRefreshAt: string;
  /** `next_refresh_at` has passed; the next tick picks it up. */
  overdue: boolean;
  checkpointHours: number;
  commentsCollectedCount: number | null;
  commentsCollectedAt: string | null;
};

// --- Schedules --------------------------------------------------------------

export type AdminSchedulerState = {
  config: {
    intervalMinutes: number;
    tierIntervalHours: Record<string, number>;
    checkpointsHours: readonly number[];
  };
  schedules: {
    scheduleId: string;
    cron: string;
    destination: string;
    isPaused: boolean;
    createdAt: string;
    lastScheduleTime: string | null;
    nextScheduleTime: string | null;
  }[];
  /** Null when QStash could not be reached; `schedulesError` says why. */
  schedulesError: string | null;
  nextTick: {
    sources: {
      sourceId: string;
      name: string | null;
      activityTier: string;
      lastRunAt: string;
      status: string;
      maxRecords: number | null;
    }[];
    budgets: {
      sourceId: string;
      limit: number;
      used: number;
      remaining: number;
    }[];
    refreshes: {
      due: number;
      runs: { sourceId: string | null; posts: number }[];
    };
  };
};

export type ListWorkflowRunsParams = {
  workflow: "schedule-collections" | "collect-source";
  cursor?: string;
  count?: number;
};

export type AdminWorkflowRun = {
  workflowRunId: string;
  state: string;
  createdAt: string;
  completedAt: string | null;
  steps: {
    name: string;
    state: string;
    createdAt: string | null;
    out: unknown;
  }[];
  error: string | null;
};

export type ListWorkflowRunsResult = {
  runs: AdminWorkflowRun[];
  cursor: string | null;
};
