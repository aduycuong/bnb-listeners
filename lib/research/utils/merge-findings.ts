import type { Finding } from "../types";

/**
 * LangGraph reducer for the `findings` channel: appends new findings to the
 * accumulated list, keeping the first occurrence of each `ref` so repeated
 * search iterations do not duplicate sources.
 */
export function mergeFindings(
  existing: Finding[],
  incoming: Finding[],
): Finding[] {
  const merged = [...existing];
  const seen = new Set(existing.map((finding) => finding.ref));

  for (const finding of incoming) {
    if (seen.has(finding.ref)) continue;
    seen.add(finding.ref);
    merged.push(finding);
  }

  return merged;
}
