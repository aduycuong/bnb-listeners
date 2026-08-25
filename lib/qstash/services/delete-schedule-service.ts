import { getQstashClient } from "../utils/get-qstash-client";
import { isScheduleNotFoundError } from "../utils/is-schedule-not-found-error";

export type DeleteScheduleParams = {
  scheduleId: string;
};

export type DeleteScheduleResult = {
  ok: true;
};

export async function deleteSchedule(
  params: DeleteScheduleParams
): Promise<DeleteScheduleResult> {
  const client = getQstashClient();

  try {
    await client.schedules.delete(params.scheduleId);
  } catch (error) {
    if (isScheduleNotFoundError(error)) {
      return { ok: true };
    }

    throw error;
  }

  return { ok: true };
}
