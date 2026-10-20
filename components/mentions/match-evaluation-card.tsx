"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { formatPercent } from "./mention-labels";
import {
  useEnrichEvaluation,
  useMatchEvaluation,
  type MentionsApiScope,
} from "./use-mentions-api";

/** Precision and recall of Match on the latest labeled sample. */
export function MatchEvaluationCard({
  scope,
  labelHref,
}: {
  scope: MentionsApiScope;
  labelHref: string;
}) {
  const match = useMatchEvaluation(scope);
  const enrich = useEnrichEvaluation(scope);
  const isLoading = match.isLoading || enrich.isLoading;
  const error = match.error ?? enrich.error;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Đang tải kết quả đo…</p> : null}
      {!isLoading && !error && !match.data && !enrich.data ? (
        <p className="text-sm text-muted-foreground">
          Chưa có mẫu gán nhãn. Tạo một mẫu ngẫu nhiên để đo độ chính xác của Match.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {enrich.data ? (
        <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span>
            <b>{enrich.data.sampleName}</b>: {enrich.data.labeled} mention đã gán nhãn
          </span>
          <span>Sentiment đúng {formatPercent(enrich.data.sentimentAccuracy)}</span>
          <span>Khía cạnh F1 {formatPercent(enrich.data.aspect.f1)}</span>
        </div>
      ) : null}
      {match.data ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span>
            <b>{match.data.sampleName}</b>: {match.data.labeled}/
            {match.data.strata.reduce((total, stratum) => total + stratum.sampled, 0)} đã gán nhãn
          </span>
          <span>Precision {formatPercent(match.data.precision)}</span>
          <span>Recall {formatPercent(match.data.recall)}</span>
          {match.data.precisionByMatchType.map((row) => (
            <span key={row.matchType} className="text-muted-foreground">
              {row.matchType === "direct" ? "Nhắc tên" : "Ngữ cảnh"}: {formatPercent(row.precision)} (n={row.labeled})
            </span>
          ))}
          {!match.data.current ? (
            <span className="text-xs text-destructive">
              Cấu hình đã đổi sau khi lấy mẫu, nên tạo mẫu mới.
            </span>
          ) : null}
        </div>
      ) : null}
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={labelHref} />}>
        Gán nhãn mẫu
      </Button>
    </section>
  );
}
