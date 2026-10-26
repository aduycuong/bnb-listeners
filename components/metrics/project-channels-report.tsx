"use client";

import Link from "next/link";

import {
  ChannelMixChart,
  ChannelSentimentChart,
  HeatmapChart,
} from "@/components/projects/demo/demo-charts";
import { DemoGrid, DemoPanel, DemoTable } from "@/components/projects/demo/demo-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { sharePercent } from "@/lib/metrics/formulas";
import { AQUA_PAGE_META, formatCount, formatShort } from "@/lib/projects/aqua-demo";

import { MetricsEmpty, MetricsPageHeader } from "./metrics-page-header";
import { useChannelMetrics, type MetricsApiScope } from "./use-metrics-api";
import { useReportPeriodDays } from "./use-report-period-days";

/** Channels page of real projects, laid out as the approved demo (phase 5b). */
export function ProjectChannelsReport({
  scope,
  projectName,
  mentionsHref,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  mentionsHref: string;
  banner: ProjectPageBannerProps;
}) {
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useChannelMetrics(scope, days);
  const channels = data?.channels ?? [];
  const total = channels.reduce((sum, channel) => sum + channel.mentions, 0);
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const cell of data?.heat ?? []) heat[cell.weekday][cell.hour] = cell.mentions;
  const empty = isPending ? "Đang tải…" : `Chưa có đề cập trong ${days} ngày gần nhất.`;

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={AQUA_PAGE_META.channels.title}
        subtitle={`${projectName} · kênh và nguồn của các đề cập có liên quan`}
        days={days}
        onDaysChange={setDays}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <DemoGrid>
        <DemoPanel title="Tỷ trọng theo kênh" span="s5" scope="common">
          {total > 0 ? (
            <ChannelMixChart
              names={channels.map((channel) => channel.channel)}
              channels={channels.map((channel) => sharePercent(channel.mentions, total) ?? 0)}
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Cảm xúc theo kênh"
          span="s7"
          scope="common"
          note="Tỷ lệ trên các đề cập đã phân loại cảm xúc của từng kênh"
        >
          {total > 0 ? (
            <ChannelSentimentChart
              rows={channels.map((channel) => {
                const classified = channel.positive + channel.neutral + channel.negative;
                return {
                  channel: channel.channel,
                  positive: sharePercent(channel.positive, classified) ?? 0,
                  neutral: sharePercent(channel.neutral, classified) ?? 0,
                  negative: sharePercent(channel.negative, classified) ?? 0,
                };
              })}
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </DemoPanel>
        <DemoPanel
          title="Thời điểm thảo luận sôi nổi nhất"
          span="s7"
          scope="common"
          note={`Số đề cập theo giờ trong ngày và thứ trong tuần (giờ ${data?.timezone ?? "của project"}). Dùng để chọn giờ đăng bài, giờ trực CSKH.`}
        >
          {total > 0 ? <HeatmapChart counts={heat} /> : <MetricsEmpty>{empty}</MetricsEmpty>}
        </DemoPanel>
        <DemoPanel
          title="Nguồn có ảnh hưởng nhất"
          span="s5"
          scope="common"
          note="Bài: đề cập là bài đăng. Tương tác: tổng lượt thích, bình luận, chia sẻ của các đề cập. Bấm một nguồn để xem đề cập."
        >
          {data?.sources.length ? (
            <DemoTable
              headers={[
                { label: "Nguồn" },
                { label: "Loại" },
                { label: "Bài", numeric: true },
                { label: "Đề cập", numeric: true },
                { label: "Tương tác", numeric: true },
              ]}
              rows={data.sources.map((source) => [
                source.id ? (
                  <Link
                    key="name"
                    href={`${mentionsHref}?sourceId=${source.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {source.name}
                  </Link>
                ) : (
                  source.name
                ),
                source.channel,
                formatCount(source.posts),
                formatCount(source.mentions),
                formatShort(source.engagement),
              ])}
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </DemoPanel>
      </DemoGrid>
    </div>
  );
}
