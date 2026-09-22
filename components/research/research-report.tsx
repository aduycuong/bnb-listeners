"use client";

import { ResearchMarkdown } from "@/components/research/research-markdown";
import type { ResearchRunResult } from "@/lib/research/types";
import { formatFindingKindLabel } from "@/lib/research/utils/format-finding-kind-label";

type ResearchReportProps = {
  result: ResearchRunResult;
};

function formatSourceDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function ResearchReport({ result }: ResearchReportProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{result.iterations} iteration{result.iterations === 1 ? "" : "s"}</span>
          <span>·</span>
          <span>{result.findingCount} finding{result.findingCount === 1 ? "" : "s"}</span>
        </div>
        <ResearchMarkdown content={result.report} />
      </div>

      {result.sources.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Sources</h2>
          <ul className="space-y-2">
            {result.sources.map((source) => {
              const meta = [
                formatFindingKindLabel(source.kind, source.docType),
                formatSourceDate(source.publishedAt),
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={`${source.index}-${source.ref}`}
                  className="rounded-lg border bg-card px-4 py-3 text-sm"
                >
                  <p className="font-medium">
                    [{source.index}] {source.title}
                  </p>
                  {meta ? (
                    <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                  ) : null}
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {source.ref}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
