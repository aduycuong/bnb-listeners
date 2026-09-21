import type { Finding, ResearchSource } from "../types";
import { formatFindingKindLabel } from "./format-finding-kind-label";

/**
 * Turns the accumulated findings into a numbered context block for the
 * synthesis prompt plus a parallel list of citation sources. Internal chunks
 * cite as `doc:{id}`, web results cite by URL — both share one numbering.
 */
export function formatFindings(findings: Finding[]): {
  context: string;
  sources: ResearchSource[];
} {
  const sources: ResearchSource[] = findings.map((finding, i) => ({
    index: i + 1,
    kind: finding.kind,
    ref: finding.ref,
    title: finding.title,
    docType: finding.docType,
    publishedAt: finding.publishedAt,
  }));

  const context = findings
    .map((finding, i) => {
      const meta = [
        finding.title,
        formatFindingKindLabel(finding.kind, finding.docType),
        finding.publishedAt
          ? new Date(finding.publishedAt).toLocaleDateString("en-US", {
              dateStyle: "medium",
            })
          : null,
        finding.ref,
      ]
        .filter(Boolean)
        .join(" · ");

      return `[${i + 1}] ${meta}\n${finding.content}`;
    })
    .join("\n\n---\n\n");

  return { context, sources };
}
