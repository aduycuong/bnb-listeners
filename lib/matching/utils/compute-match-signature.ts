import { createHash } from "node:crypto";

/** Changes when a query is added, removed or edited, or the source list changes. */
export function computeMatchSignature(params: {
  queries: { id: string; version: number; enabled: boolean }[];
  sourceIds: string[];
}): string {
  const queries = params.queries
    .filter((query) => query.enabled)
    .map((query) => `${query.id}:${query.version}`)
    .sort();
  const sources = [...params.sourceIds].sort();
  return createHash("sha256")
    .update(JSON.stringify({ queries, sources }))
    .digest("hex")
    .slice(0, 32);
}
