import { APIError } from "@/lib/exposers/api-error";
import {
  isSystemScheduleJobName,
  SYSTEM_SCHEDULE_RUN_TRIGGER,
} from "@/lib/system-schedules/constants";
import { executeSystemScheduleJob } from "@/lib/system-schedules/services/execute-system-schedule-job";

import { qstashJobHandlers } from "../job-config";
import type {
  DispatchQstashJobParams,
  DispatchQstashJobResult,
} from "../types";

export async function dispatchQstashJobService(
  params: DispatchQstashJobParams,
): Promise<DispatchQstashJobResult> {
  if (isSystemScheduleJobName(params.jobName)) {
    await executeSystemScheduleJob({
      jobName: params.jobName,
      payload: params.payload,
      trigger: SYSTEM_SCHEDULE_RUN_TRIGGER.scheduled,
      userId: params.userId,
    });

    return { ok: true };
  }

  const handler = qstashJobHandlers[params.jobName];

  if (!handler) {
    throw new APIError(
      "QSTASH_UNKNOWN_JOB",
      `Unknown QStash job: ${params.jobName}`,
      400,
    );
  }

  await handler(params.payload, { userId: params.userId });

  return { ok: true };
}
