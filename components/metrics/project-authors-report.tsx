"use client";

import Link from "next/link";
import { useState } from "react";

import { DonutChart } from "@/components/projects/demo/demo-charts";
import { DemoGrid, DemoPanel, DemoTable, SentimentPill } from "@/components/projects/demo/demo-ui";
import type { Sentiment } from "@/lib/enrichment/config";
import { AUTHOR_TIERS, METRICS_CONFIG } from "@/lib/metrics/config";
import {
  AQUA_PAGE_META,
  AQUA_SENTIMENT_LABEL,
  formatCount,
  formatShort,
  type AquaSentiment,
} from "@/lib/projects/aqua-demo";

import { MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { useAuthorMetrics, type MetricsApiScope } from "./use-metrics-api";

const PILL: Record<Sentiment, AquaSentiment> = {
  positive: "pos",
  neutral: "neu",
  negative: "neg",
};

/** Colours of the demo's author groups, in the order of `AUTHOR_TIERS`. */
const TIER_COLORS = ["#0B2545", "#0091FF", "#5CC8FF", "#00C9A7", "#FFC93C"];

const TIER_LABELS = new Map<string, string>(AUTHOR_TIERS.map((tier) => [tier.key, tier.label]));

/** Authors page of real projects, laid out as the approved demo (phase 5b). */
export function ProjectAuthorsReport({
  scope,
  projectName,
  mentionsHref,
}: {
  scope: MetricsApiScope;
  projectName: string;
  mentionsHref: string;
}) {
  const [days, setDays] = useState<number>(METRICS_CONFIG.reportPeriodDays[0]);
  const { data, error, isPending, isFetching } = useAuthorMetrics(scope, days);
  const authorTotal = data?.tiers.reduce((sum, tier) => sum + tier.authors, 0) ?? 0;
  const empty = isPending ? "Đang tải…" : `Chưa có đề cập trong ${days} ngày gần nhất.`;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 md:px-7">
      <MetricsPageHeader
        title={AQUA_PAGE_META.authors.title}
        subtitle={`${projectName} · tác giả của các đề cập có liên quan`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <DemoGrid>
        <DemoPanel
          title="Tác giả có ảnh hưởng nhất"
          span="s8"
          scope="common"
          note="Xếp theo tổng tương tác trên các đề cập của tác giả trong kỳ. Bấm tên để xem đề cập của tác giả."
        >
          {data?.items.length ? (
            <DemoTable
              headers={[
                { label: "Tác giả" },
                { label: "Nền tảng" },
                { label: "Phân loại" },
                { label: "Người theo dõi", numeric: true },
                { label: "Bài đề cập", numeric: true },
                { label: "Tương tác", numeric: true },
                { label: "Thái độ chính" },
              ]}
              rows={data.items.map((author) => [
                <span key="name" className="inline-flex items-center gap-1.5">
                  <Link
                    href={`${mentionsHref}?authorId=${author.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {author.name}
                  </Link>
                  {author.url ? (
                    <a
                      href={author.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary"
                      aria-label={`Trang của ${author.name}`}
                    >
                      ↗
                    </a>
                  ) : null}
                </span>,
                author.channel,
                TIER_LABELS.get(author.tier) ?? author.tier,
                author.followers === null ? "—" : formatShort(author.followers),
                formatCount(author.mentions),
                formatShort(author.engagement),
                author.sentiment ? (
                  <SentimentPill
                    key="pill"
                    sentiment={PILL[author.sentiment]}
                    label={AQUA_SENTIMENT_LABEL[PILL[author.sentiment]]}
                  />
                ) : (
                  "—"
                ),
              ])}
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Cơ cấu tác giả"
          span="s4"
          scope="common"
          note={
            data?.withoutFollowers
              ? `${formatCount(data.withoutFollowers)}/${formatCount(authorTotal)} tác giả chưa có số người theo dõi, tạm tính là người dùng thường.`
              : "Phân loại theo số người theo dõi."
          }
        >
          {data && authorTotal > 0 ? (
            <DonutChart
              height={260}
              cutout="58%"
              data={data.tiers.map((tier) => ({
                name: TIER_LABELS.get(tier.tier) ?? tier.tier,
                value: tier.authors,
              }))}
              colors={TIER_COLORS}
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </DemoPanel>
      </DemoGrid>
    </div>
  );
}
