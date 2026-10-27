"use client";

import { StackedShareChart } from "@/components/metrics/report-ui/report-charts";
import { ReportGrid, ReportPanel, ReportTable } from "@/components/metrics/report-ui/report-ui";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
import { AUTHOR_TIERS } from "@/lib/metrics/config";
import { formatCount, formatShort } from "@/lib/projects/aqua-demo";

import { MetricsEmpty } from "../metrics-page-header";
import { useCompareReports, type MetricsApiScope } from "../use-metrics-api";
import { useReportPeriodDays } from "../use-report-period-days";
import { toComparedMembers } from "./compare-members";
import { CompareReportShell, MemberColumns } from "./compare-report-shell";

const REPORTS = [{ key: "author-tiers" }, { key: "top-authors", params: { limit: 5 } }] as const;

/** Colours of the author groups, in the order of `AUTHOR_TIERS` (as on the Authors page). */
const TIER_COLORS = ["#0B2545", "#0091FF", "#5CC8FF", "#00C9A7", "#FFC93C"];

/** Authors of the primary project against its competitors (D30). */
export function CompareAuthorsReport({
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
    const [tiers, authors] = member.reports;
    return { ...member, tiers: tiers.data, authors: authors.data ?? [] };
  });
  const loading = isPending ? "Đang tải…" : null;
  const hasAuthors = members.some((member) => member.tiers?.tiers.some((tier) => tier.authors > 0));

  return (
    <CompareReportShell
      title="KOL & tác giả"
      subtitle={`${projectName} · tác giả của project chính so với đối thủ`}
      days={days}
      onDaysChange={setDays}
      loading={isFetching && !isPending}
      banner={banner}
      error={error}
      issues={data?.issues}
      warnings={data?.warnings}
    >
      <ReportGrid>
        <ReportPanel
          title="Cơ cấu tác giả"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note="Tỷ lệ tác giả theo nhóm người theo dõi; tác giả chưa có số người theo dõi tính là người dùng thường"
        >
          {hasAuthors ? (
            <StackedShareChart
              rows={members.map((member) => ({
                name: member.name,
                values: AUTHOR_TIERS.map(
                  ({ key }) => member.tiers?.tiers.find((tier) => tier.tier === key)?.authors ?? 0,
                ),
              }))}
              segments={AUTHOR_TIERS.map((tier, index) => ({
                key: tier.label,
                color: TIER_COLORS[index],
              }))}
            />
          ) : (
            <MetricsEmpty>{loading ?? `Chưa có đề cập trong ${days} ngày gần nhất.`}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Tác giả có ảnh hưởng nhất"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note="Top 5 tác giả theo tổng tương tác trên các đề cập của từng project"
        >
          {members.length ? (
            <MemberColumns
              members={members}
              render={(member) =>
                member.authors.length ? (
                  <ReportTable
                    headers={[
                      { label: "Tác giả" },
                      { label: "Đề cập", numeric: true },
                      { label: "Tương tác", numeric: true },
                    ]}
                    rows={member.authors.map((author) => [
                      author.url ? (
                        <a
                          key="name"
                          href={author.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {author.name}
                        </a>
                      ) : (
                        author.name
                      ),
                      formatCount(author.mentions),
                      formatShort(author.engagement),
                    ])}
                  />
                ) : (
                  <p className="text-[13px] text-muted-foreground">Chưa có tác giả.</p>
                )
              }
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </CompareReportShell>
  );
}
