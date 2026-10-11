/** Event the `collect-source` workflow waits on until the raw payload is stored. */
export function getCollectRunEventId(collectRunId: string): string {
  return `collect-run:${collectRunId}:stored`;
}
