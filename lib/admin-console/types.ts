import type { ContentItemMedia } from "@/db/schema";
import type { ActivityTier, CollectRunStatus, ConnectorKey } from "@/lib/connectors/constants";
import type { SourceBudget } from "@/lib/connectors/services/get-source-budgets";
import type { BillingUnit, SpendingProviderKey } from "@/lib/spending/config";

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
  /** `manual`: tier pinned by an admin (`activity_tier_locked`), or paused. */
  tierMode: "auto" | "manual";
  /** Tier the automatic rule gives now; null for a keyword search (fixed interval). */
  autoTier: Exclude<ActivityTier, "paused"> | null;
  /** `search`: a TikTok keyword search runs at its own interval, not by tier. */
  intervalRule: "tier" | "search";
  /** Hours between post runs; null when paused. */
  intervalHours: number | null;
  monthlyRecordLimit: number | null;
  /** Per day in Vietnam time; null = unlimited. */
  dailyRecordLimit: number | null;
  origin: string;
  lastCollectedAt: string | null;
  posts: number;
  comments: number;
  /** Posts per day over the tier window (a newer source: over what it has). */
  postsPerDay: number;
  usedThisMonth: number;
  usedToday: number;
  lastPostRun: {
    id: string;
    status: CollectRunStatus;
    createdAt: string;
  } | null;
  /** Last post run + tier interval; null when the scheduler skips the source. */
  nextPostRunAt: string | null;
};

/** Tier settings in use, for tooltips and the source form. */
export type AdminTierRules = {
  intervalHours: Record<Exclude<ActivityTier, "paused">, number>;
  minPostsPerDay: { hot: number; normal: number };
  windowDays: number;
  searchIntervalHours: number;
  /** Records cap of one post run; a run that hits it can miss posts. */
  maxRecordsPerRun: number;
};

export type ListAdminSourcesResult = {
  items: AdminSourceRow[];
  tierRules: AdminTierRules;
};

export type AdminSourceDetail = AdminSourceRow & {
  tierRules: AdminTierRules;
  externalId: string;
  followerCount: number | null;
  memberCount: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pendingRefreshes: number;
  /** Projects that follow the source; deleting it removes it from them. */
  projects: { id: string; name: string }[];
  /** Collect runs still pending or running; the source cannot be deleted meanwhile. */
  activeRuns: number;
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
    tierRules: AdminTierRules;
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
      intervalHours: number;
      status: string;
      maxRecords: number | null;
    }[];
    budgets: SourceBudget[];
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

// --- Spending ---------------------------------------------------------------

export type GetAdminSpendingParams = {
  /** Days of the range, ending today (UTC). */
  days?: number;
};

export type AdminSpendingAmount = {
  /** Billed units: records or requests, per the provider's billing. */
  units: number;
  /** USD at the current price. */
  cost: number;
};

export type AdminSpendingProvider = {
  key: SpendingProviderKey;
  label: string;
  billing: BillingUnit;
  unitLabel: string;
  color: string;
  pricePer1k: number;
  /** USD per month; null when none is set. */
  monthlyBudget: number | null;
};

export type AdminSpendingDay = {
  /** UTC day, `YYYY-MM-DD`. */
  date: string;
  byProvider: Record<SpendingProviderKey, AdminSpendingAmount>;
};

export type AdminSpendingMonthProvider = AdminSpendingAmount & {
  /** Average daily cost of the last `runRateDays` full days. */
  runRatePerDay: number;
  /** Month to date plus the run rate over the rest of the month. */
  forecastCost: number;
};

export type AdminSpendingBreakdownRow = AdminSpendingAmount & {
  provider: SpendingProviderKey;
  runs: number;
};

export type AdminSpending = {
  currency: string;
  generatedAt: string;
  providers: AdminSpendingProvider[];
  /** First day of the selected range (UTC). */
  rangeStart: string;
  rangeDays: number;
  /** One row per UTC day from the earlier of the range start and the month start, to today. */
  daily: AdminSpendingDay[];
  month: {
    start: string;
    /** First day of the next month. */
    end: string;
    daysInMonth: number;
    runRateDays: number;
    byProvider: Record<SpendingProviderKey, AdminSpendingMonthProvider>;
  };
  /** Within the range. */
  byConnector: (AdminSpendingBreakdownRow & { connector: string })[];
  /** Within the range; the most expensive sources of each provider. */
  topSources: (AdminSpendingBreakdownRow & {
    sourceId: string;
    name: string | null;
    platform: string | null;
  })[];
};
