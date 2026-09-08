export const systemSchedulesQueryKey = ["admin", "system-schedules"] as const;

export const systemScheduleRunsQueryKey = (systemScheduleId: string) =>
  ["admin", "system-schedules", systemScheduleId, "runs"] as const;

export const authMeQueryKey = ["auth", "me"] as const;
