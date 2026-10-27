"use client";

import { HeatmapChart, StackedShareChart } from "@/components/metrics/report-ui/report-charts";
import { ReportBars, ReportGrid, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
import { formatCount } from "@/lib/projects/aqua-demo";

import { MetricsEmpty } from "../metrics-page-header";
import { useCompareReports, type MetricsApiScope } from "../use-metrics-api";
import { useReportPeriodDays } from "../use-report-period-days";
import { toComparedMembers } from "./compare-members";
import { CompareReportShell, MemberColumns } from "./compare-report-shell";

const REPORTS = [
  { key: "channel-breakdown" },
  { key: "source-ranking", params: { limit: 5 } },
  { key: "posting-heatmap" },
] as const;

const CHANNEL_COLORS = ["#0091FF", "#00C9A7", "#FFC93C", "#FF6B6B", "#8B5CF6", "#64748B"];

/** Channels, sources and posting hours of the primary project against its competitors (D30). */
export function CompareChannelsReport({
  scope,
  projectName,
  caseLabel,
  banner,
}: {
  scope: MetricsApiScope;
  projectName: string;
  caseLabel: string;
  banner: ProjectPageBannerProps;
}) {
  const [days, setDays] = useReportPeriodDays();
  const { data, error, isPending, isFetching } = useCompareReports(scope, days, REPORTS);
  const members = toComparedMembers(data?.members ?? []).map((member) => {
    const [channels, sources, heat] = member.reports;
    return {
      ...member,
      channels: channels.data ?? [],
      sources: sources.data ?? [],
      heat: heat.data ?? [],
    };
  });
  const loading = isPending ? "Đang tải…" : null;
  // Channels of every member, most mentioned overall first.
  const channelTotals = new Map<string, number>();
  for (const item of members.flatMap((member) => member.channels)) {
    channelTotals.set(item.channel, (channelTotals.get(item.channel) ?? 0) + item.mentions);
  }
  const channels = [...channelTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel]) => channel);
  const empty = loading ?? `Chưa có đề cập trong ${days} ngày gần nhất.`;

  return (
    <CompareReportShell
      title="Kênh & nguồn"
      subtitle={`${projectName} · kênh và nguồn của project chính so với đối thủ`}
      days={days}
      onDaysChange={setDays}
      loading={isFetching && !isPending}
      banner={banner}
      error={error}
      issues={data?.issues}
      warnings={data?.warnings}
    >
      <ReportGrid>
        <ReportPanel title="Tỷ trọng theo kênh" span="s12" scope="case" scopeLabel={caseLabel}>
          {channels.length ? (
            <StackedShareChart
              rows={members.map((member) => ({
                name: member.name,
                values: channels.map(
                  (channel) => member.channels.find((item) => item.channel === channel)?.mentions ?? 0,
                ),
              }))}
              segments={channels.map((channel, index) => ({
                key: channel,
                color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
              }))}
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Nguồn có nhiều đề cập nhất"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note="Top 5 nguồn (group, page, kênh) của từng project"
        >
          {members.length ? (
            <MemberColumns
              members={members}
              render={(member) =>
                member.sources.length ? (
                  <ReportBars
                    rows={member.sources.map((source) => ({
                      label: source.name,
                      value: source.mentions,
                      display: formatCount(source.mentions),
                    }))}
                  />
                ) : (
                  <p className="text-[13px] text-muted-foreground">Chưa có đề cập.</p>
                )
              }
            />
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Thời điểm thảo luận sôi nổi nhất"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note="Số đề cập theo giờ và thứ, theo múi giờ của từng project"
        >
          {members.length ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {members.map((member) => {
                const counts = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
                for (const cell of member.heat) counts[cell.weekday][cell.hour] = cell.mentions;
                return (
                  <div key={member.id} className="min-w-0">
                    <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                      <i className="size-2.5 rounded-full" style={{ background: member.color }} />
                      {member.primary ? `★ ${member.name}` : member.name}
                    </h4>
                    <HeatmapChart counts={counts} />
                  </div>
                );
              })}
            </div>
          ) : (
            <MetricsEmpty>{empty}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </CompareReportShell>
  );
}
