import type { Schedule } from "@upstash/qstash";

import { getQstashClient } from "../utils/get-qstash-client";
import { isScheduleNotFoundError } from "../utils/is-schedule-not-found-error";

export type GetScheduleParams = {
  scheduleId: string;
};

export async function getSchedule(
  params: GetScheduleParams
): Promise<Schedule | null> {
  const client = getQstashClient();

  try {
    return await client.schedules.get(params.scheduleId);
  } catch (error) {
    if (isScheduleNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}
