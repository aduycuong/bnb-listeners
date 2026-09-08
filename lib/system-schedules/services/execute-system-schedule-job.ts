import { APIError } from "@/lib/exposers/api-error";
import { qstashJobHandlers } from "@/lib/qstash/job-config";

import {
  SYSTEM_SCHEDULE_RUN_STATUS,
  isSystemScheduleJobName,
} from "../constants";
import type {
  ExecuteSystemScheduleJobParams,
  SystemScheduleJobMetrics,
} from "../types";
import { getSystemScheduleByJobName } from "./get-system-schedule";
import {
  createSystemScheduleRun,
  finalizeSystemScheduleRun,
} from "./system-schedule-run-lifecycle";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function toJobMetrics(value: unknown): SystemScheduleJobMetrics | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const metrics = value as Partial<SystemScheduleJobMetrics>;
  if (
    typeof metrics.rowsClaimed !== "number" ||
    typeof metrics.rowsProcessed !== "number" ||
    typeof metrics.batchSize !== "number"
  ) {
    return null;
  }

  return {
    rowsClaimed: metrics.rowsClaimed,
    rowsProcessed: metrics.rowsProcessed,
    batchSize: metrics.batchSize,
    durationMs:
      typeof metrics.durationMs === "number" ? metrics.durationMs : 0,
  };
}

export async function executeSystemScheduleJob(
  params: ExecuteSystemScheduleJobParams,
): Promise<SystemScheduleJobMetrics | null> {
  if (!isSystemScheduleJobName(params.jobName)) {
    throw new APIError(
      "ERR_NOT_SYSTEM_SCHEDULE",
      `Job is not a registered system schedule: ${params.jobName}`,
      400,
    );
  }

  const handler = qstashJobHandlers[params.jobName];
  if (!handler) {
    throw new APIError(
      "QSTASH_UNKNOWN_JOB",
      `Unknown QStash job: ${params.jobName}`,
      400,
    );
  }

  const schedule = await getSystemScheduleByJobName(params.jobName);
  if (!schedule) {
    throw new APIError(
      "ERR_SYSTEM_SCHEDULE_NOT_FOUND",
      `System schedule row missing for job: ${params.jobName}. Run db:seed-system-schedules.`,
      500,
    );
  }

  if (!schedule.enabled) {
    return null;
  }

  const run = await createSystemScheduleRun({
    systemScheduleId: schedule.id,
    trigger: params.trigger,
    qstashMessageId: params.qstashMessageId,
  });

  const startedAt = Date.now();

  try {
    const handlerResult = await handler(params.payload, {
      userId: params.userId,
    });
    const metrics = toJobMetrics(handlerResult);
    const durationMs = Date.now() - startedAt;

    await finalizeSystemScheduleRun({
      runId: run.id,
      status: SYSTEM_SCHEDULE_RUN_STATUS.success,
      result: {
        ...(metrics ?? {}),
        durationMs: metrics?.durationMs ?? durationMs,
      },
    });

    return metrics
      ? { ...metrics, durationMs: metrics.durationMs || durationMs }
      : null;
  } catch (error) {
    const message = getErrorMessage(error);

    await finalizeSystemScheduleRun({
      runId: run.id,
      status: SYSTEM_SCHEDULE_RUN_STATUS.failed,
      error: message,
      result: { durationMs: Date.now() - startedAt },
    });

    throw error;
  }
}
