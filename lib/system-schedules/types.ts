import type {
  SystemScheduleRunStatus,
  SystemScheduleRunTrigger,
} from "./constants";

export type SystemScheduleJobMetrics = {
  rowsClaimed: number;
  rowsProcessed: number;
  batchSize: number;
  durationMs: number;
};

export type SystemScheduleListItem = {
  id: string;
  scheduleId: string;
  jobName: string;
  cronConfig: { cron: string; timezone: string };
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListSystemSchedulesResult = {
  items: SystemScheduleListItem[];
};

export type SystemScheduleRunListItem = {
  id: string;
  systemScheduleId: string;
  workspaceId: string | null;
  status: SystemScheduleRunStatus;
  trigger: SystemScheduleRunTrigger;
  result: Record<string, unknown> | null;
  error: string | null;
  qstashMessageId: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type ListSystemScheduleRunsParams = {
  systemScheduleId: string;
  limit?: number;
};

export type ListSystemScheduleRunsResult = {
  items: SystemScheduleRunListItem[];
};

export type ExecuteSystemScheduleJobParams = {
  jobName: string;
  payload?: unknown;
  trigger: SystemScheduleRunTrigger;
  qstashMessageId?: string;
  userId?: string;
};
