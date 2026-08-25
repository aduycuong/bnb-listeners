import { getQstashClient } from "../utils/get-qstash-client";
import { getCallbackUrl } from "../utils/get-callback-url";
import type { ScheduleJobParams, ScheduleJobResult } from "../types";

export async function createSchedule(
  params: ScheduleJobParams
): Promise<ScheduleJobResult> {
  const client = getQstashClient();
  const callbackUrl = getCallbackUrl();

  const res = await client.schedules.create({
    destination: callbackUrl,
    cron: params.cron,
    ...(params.scheduleId && { scheduleId: params.scheduleId }),
    body: JSON.stringify({
      jobName: params.jobName,
      payload: params.payload,
      userId: params.userId,
    }),
  });

  return {
    scheduleId: res.scheduleId,
  };
}
