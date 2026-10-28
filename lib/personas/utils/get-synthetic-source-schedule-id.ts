/** QStash schedule id of a scheduled synthetic source. */
export function getSyntheticSourceScheduleId(sourceId: string): string {
  return `synthetic-source-schedule-${sourceId}`;
}
