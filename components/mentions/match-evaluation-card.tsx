"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { formatPercent } from "./mention-labels";
import { useMatchEvaluation, type MentionsApiScope } from "./use-mentions-api";

/** Precision and recall of Match on the latest labeled sample. */
export function MatchEvaluationCard({
  scope,
  labelHref,
}: {
  scope: MentionsApiScope;
  labelHref: string;
}) {
  const { data, error, isLoading } = useMatchEvaluation(scope);

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Đang tải kết quả đo…</p> : null}
      {error ? (
        <p className="text-sm text-muted-foreground">
          Chưa có mẫu gán nhãn. Tạo một mẫu ngẫu nhiên để đo độ chính xác của Match.
        </p>
      ) : null}
      {data ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span>
            <b>{data.sampleName}</b>: {data.labeled}/
            {data.strata.reduce((total, stratum) => total + stratum.sampled, 0)} đã gán nhãn
          </span>
          <span>Precision {formatPercent(data.precision)}</span>
          <span>Recall {formatPercent(data.recall)}</span>
          {data.precisionByMatchType.map((row) => (
            <span key={row.matchType} className="text-muted-foreground">
              {row.matchType === "direct" ? "Nhắc tên" : "Ngữ cảnh"}: {formatPercent(row.precision)} (n={row.labeled})
            </span>
          ))}
          {!data.current ? (
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
