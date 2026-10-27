export type SetScheduleEnabledParams = {
  scheduleId: string;
  enabled: boolean;
};

export type SetScheduleEnabledResult = {
  scheduleId: string;
  /**
   * `create` / `update`: written from the code definition (then resumed);
   * `resume` / `pause`: state change only; `noop`: nothing to disable.
   */
  action: "create" | "update" | "resume" | "pause" | "noop";
  /** Where the schedule now delivers; null when it does not exist. */
  destination: string | null;
};
