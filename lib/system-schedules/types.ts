import type { SystemScheduleRunTrigger } from "./constants";

export type SystemScheduleJobMetrics = {
  rowsClaimed: number;
  rowsProcessed: number;
  batchSize: number;
  durationMs: number;
};

export type ExecuteSystemScheduleJobParams = {
  jobName: string;
  payload?: unknown;
  trigger: SystemScheduleRunTrigger;
  qstashMessageId?: string;
  userId?: string;
};
