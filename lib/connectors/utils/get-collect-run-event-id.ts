/**
 * Event the `collect-source` workflow waits on until the raw payload is stored.
 * QStash allows only letters, digits, `-`, `_` and `.` in event ids.
 */
export function getCollectRunEventId(collectRunId: string): string {
  return `collect-run-${collectRunId}-stored`;
}
