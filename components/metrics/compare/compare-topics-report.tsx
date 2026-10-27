"use client";

import { ReportBars, ReportGrid, ReportPanel } from "@/components/metrics/report-ui/report-ui";
import type { ProjectPageBannerProps } from "@/components/projects/project-page-banner";
import { formatCount } from "@/lib/projects/aqua-demo";

import { MetricsEmpty } from "../metrics-page-header";
import { useCompareReports, type MetricsApiScope } from "../use-metrics-api";
import { useReportPeriodDays } from "../use-report-period-days";
import { toComparedMembers } from "./compare-members";
import { CompareReportShell, MemberColumns } from "./compare-report-shell";
import { CompareTable } from "./compare-table";

const REPORTS = [
  { key: "topics", params: { limit: 8 } },
  { key: "keywords", params: { limit: 60 } },
] as const;

const KEYWORD_ROWS = 20;
const ONLY_ONE_SIDE = 15;

/**
 * Topics and keywords of the primary project against its competitors (D30). Topics are grouped
 * per project, so they stand side by side; keywords are normalized terms and line up.
 */
export function CompareTopicsReport({
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
    const [topics, keywords] = member.reports;
    const counts = new Map((keywords.data ?? []).map((item) => [item.keyword, item.mentions]));
    return { ...member, topics: topics.data ?? [], keywords: keywords.data ?? [], counts };
  });
  type Member = (typeof members)[number];
  const loading = isPending ? "Đang tải…" : null;

  const texts = new Map<string, string>();
  const totals = new Map<string, number>();
  for (const member of members) {
    for (const item of member.keywords) {
      if (!texts.has(item.keyword)) texts.set(item.keyword, item.text);
      totals.set(item.keyword, (totals.get(item.keyword) ?? 0) + item.mentions);
    }
  }
  const byTotal = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([keyword]) => keyword);
  const primary = members.find((member) => member.primary);
  const competitors = members.filter((member) => !member.primary);
  const competitorsHave = (keyword: string) =>
    competitors.some((member) => member.counts.get(keyword));
  const competitorsOnly = byTotal
    .filter((keyword) => !primary?.counts.get(keyword) && competitorsHave(keyword))
    .slice(0, ONLY_ONE_SIDE);
  const primaryOnly = byTotal
    .filter((keyword) => primary?.counts.get(keyword) && !competitorsHave(keyword))
    .slice(0, ONLY_ONE_SIDE);
  const count = (member: Member, keyword: string) => member.counts.get(keyword) ?? 0;

  return (
    <CompareReportShell
      title="Chủ đề & từ khóa"
      subtitle={`${projectName} · chủ đề và từ khóa của project chính so với đối thủ`}
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
          title="Chủ đề nổi bật"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note="Chủ đề AI gom riêng trong từng project, nhiều đề cập nhất trong kỳ"
        >
          {members.length ? (
            <MemberColumns
              members={members}
              render={(member) =>
                member.topics.some((topic) => topic.mentions > 0) ? (
                  <ReportBars
                    rows={member.topics
                      .filter((topic) => topic.mentions > 0)
                      .map((topic) => ({
                        label: topic.name,
                        value: topic.mentions,
                        display: formatCount(topic.mentions),
                      }))}
                  />
                ) : (
                  <p className="text-[13px] text-muted-foreground">Chưa có chủ đề có đề cập.</p>
                )
              }
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có project để so sánh."}</MetricsEmpty>
          )}
        </ReportPanel>
        <ReportPanel
          title="Chỉ đối thủ được nhắc"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note="Từ khóa có ở đối thủ nhưng chưa có ở project chính"
        >
          <KeywordChips
            keywords={competitorsOnly.map((keyword) => texts.get(keyword) ?? keyword)}
            empty={loading ?? "Không có từ khóa nào chỉ đối thủ có."}
          />
        </ReportPanel>
        <ReportPanel
          title="Chỉ project chính được nhắc"
          span="s6"
          scope="case"
          scopeLabel={caseLabel}
          note="Từ khóa có ở project chính nhưng không đối thủ nào có"
        >
          <KeywordChips
            keywords={primaryOnly.map((keyword) => texts.get(keyword) ?? keyword)}
            empty={loading ?? "Không có từ khóa nào chỉ project chính có."}
          />
        </ReportPanel>
        <ReportPanel
          title="Từ khóa chung"
          span="s12"
          scope="case"
          scopeLabel={caseLabel}
          note={`${KEYWORD_ROWS} từ khóa nhiều đề cập nhất của các project, số đề cập của từng project`}
        >
          {byTotal.length ? (
            <CompareTable
              members={members}
              rowHeader="Từ khóa"
              rows={byTotal.slice(0, KEYWORD_ROWS).map((keyword) => ({
                label: texts.get(keyword) ?? keyword,
                read: (member: Member) => count(member, keyword),
                format: formatCount,
              }))}
            />
          ) : (
            <MetricsEmpty>{loading ?? "Chưa có từ khóa trong kỳ."}</MetricsEmpty>
          )}
        </ReportPanel>
      </ReportGrid>
    </CompareReportShell>
  );
}

function KeywordChips({ keywords, empty }: { keywords: string[]; empty: string }) {
  if (!keywords.length) return <MetricsEmpty>{empty}</MetricsEmpty>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((keyword) => (
        <span key={keyword} className="rounded-full bg-muted px-2.5 py-1 text-[13px]">
          {keyword}
        </span>
      ))}
    </div>
  );
}
