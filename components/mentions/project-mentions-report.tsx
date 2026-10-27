"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useReports } from "@/components/metrics/use-metrics-api";
import { MetricsEmpty, MetricsPageHeader } from "@/components/metrics/metrics-page-header";
import { useReportPeriodDays } from "@/components/metrics/use-report-period-days";
import { ReportPanel, ReportTable, SentimentPill } from "@/components/metrics/report-ui/report-ui";
import {
  ProjectPageBanner,
  projectReportPageClassName,
  type ProjectPageBannerProps,
} from "@/components/projects/project-page-banner";
import { useTopicsList } from "@/components/topics/use-topics-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { SENTIMENTS, type Sentiment } from "@/lib/enrichment/config";
import type { ListMentionsQuery } from "@/lib/mentions/schema";
import { AQUA_PAGE_META, AQUA_SENTIMENT_LABEL, type AquaSentiment } from "@/lib/projects/aqua-demo";

import { HighlightTerms } from "./highlight-terms";
import { MentionFilterSelect } from "./mention-filter-select";
import { KIND_LABELS, formatRelativeTime } from "./mention-labels";
import { MentionThreadSheet } from "./mention-thread-sheet";
import { useMentionsList, type MentionsApiScope } from "./use-mentions-api";

const ALL = "all";

/** Sources of the period for the channel filter: the most mentioned ones. */
const SOURCE_REPORTS = [{ key: "source-ranking" }] as const;

const SENTIMENT_PILL: Record<Sentiment, AquaSentiment> = {
  positive: "pos",
  neutral: "neu",
  negative: "neg",
};

/** Discussion report: relevant mentions in the demo table, without reach or engagement. */
export function ProjectMentionsReportPage({
  workspaceIndexParam,
  projectIndexParam,
}: {
  workspaceIndexParam: string;
  projectIndexParam: string;
}) {
  const { workspace, project, workspaceIndex, projectIndex } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );

  if (!workspace || !project) return null;

  return (
    <MentionsReport
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      projectName={project.name}
      banner={{
        name: project.name,
        description: project.description,
        projectCase: project.case,
        settingsHref: getProjectNavHref(workspaceIndex, projectIndex, "settings"),
      }}
    />
  );
}

function MentionsReport({
  scope,
  projectName,
  banner,
}: {
  scope: MentionsApiScope;
  projectName: string;
  banner: ProjectPageBannerProps;
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [days, setDays] = useReportPeriodDays();
  const [filters, setFilters] = useState<ListMentionsQuery>({
    relevance: "relevant",
    page: 1,
    topicId: searchParams.get("topicId") ?? undefined,
    sourceId: searchParams.get("sourceId") ?? undefined,
    authorId: searchParams.get("authorId") ?? undefined,
  });
  const [thread, setThread] = useState<{ rootId: string; focusId: string } | null>(null);
  const { data, isPending, isFetching, error } = useMentionsList(scope, {
    ...filters,
    days,
  });
  const { data: sourceReports } = useReports(scope, days, SOURCE_REPORTS);
  const { data: topics } = useTopicsList(scope);
  const update = (patch: Partial<ListMentionsQuery>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const applySearch = () => {
    const next = search.trim() || undefined;
    if (next === filters.q) return;
    update({ q: next });
  };

  const page = data?.page ?? 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const rangeStart = data && data.total > 0 ? (page - 1) * data.pageSize + 1 : 0;
  const rangeEnd = data ? (page - 1) * data.pageSize + data.items.length : 0;
  const topicName = topics?.items.find((topic) => topic.id === filters.topicId)?.name;
  const authorName = data?.items[0]?.authorName;
  const sourceOptions = [
    { value: ALL, label: "Tất cả kênh" },
    ...(sourceReports?.reports[0].data ?? []).flatMap((source) =>
      source.id ? [{ value: source.id, label: source.name }] : [],
    ),
  ];
  if (filters.sourceId && !sourceOptions.some((option) => option.value === filters.sourceId)) {
    sourceOptions.push({
      value: filters.sourceId,
      label: data?.items[0]?.sourceName ?? "Nguồn đang lọc",
    });
  }

  return (
    <div className={projectReportPageClassName}>
      <MetricsPageHeader
        title={AQUA_PAGE_META.mentions.title}
        subtitle={`${projectName} · đề cập có liên quan`}
        days={days}
        onDaysChange={(next) => {
          setDays(next);
          update({ page: 1 });
        }}
        loading={isFetching && !isPending}
      />
      <ProjectPageBanner {...banner} />
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-56 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <Input
            className="h-8"
            type="search"
            placeholder="Tìm trong nội dung, tác giả, chủ đề…"
            aria-label="Tìm kiếm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit" size="sm" variant="outline">
            Tìm
          </Button>
        </form>
        <MentionFilterSelect
          label="Lọc kênh"
          value={filters.sourceId ?? ALL}
          options={sourceOptions}
          onChange={(value) => update({ sourceId: value === ALL ? undefined : value })}
        />
        <div className="flex flex-wrap gap-1">
          <SentimentButton
            pressed={(filters.sentiment ?? ALL) === ALL}
            onClick={() => update({ sentiment: ALL })}
          >
            Tất cả
          </SentimentButton>
          {SENTIMENTS.map((sentiment) => (
            <SentimentButton
              key={sentiment}
              pressed={filters.sentiment === sentiment}
              onClick={() => update({ sentiment })}
            >
              {AQUA_SENTIMENT_LABEL[SENTIMENT_PILL[sentiment]]}
            </SentimentButton>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {data
            ? data.total === 0
              ? "Hiển thị 0/0 đề cập"
              : `Hiển thị ${rangeStart}–${rangeEnd} / ${data.total} đề cập`
            : "Đang tải…"}
        </span>
      </div>

      {filters.topicId || filters.authorId ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.topicId ? (
            <Button size="sm" variant="secondary" onClick={() => update({ topicId: undefined })}>
              Chủ đề: {topicName ?? "đang lọc"} ✕
            </Button>
          ) : null}
          {filters.authorId ? (
            <Button size="sm" variant="secondary" onClick={() => update({ authorId: undefined })}>
              Tác giả: {authorName ?? "đang lọc"} ✕
            </Button>
          ) : null}
        </div>
      ) : null}

      <ReportPanel
        title="Đề cập mới nhất"
        span="s12"
        scope="common"
        note="Đề cập có liên quan trong kỳ, mới nhất trước. Bấm một dòng để xem cả thread."
      >
        {data && data.items.length > 0 ? (
          <ReportTable
            headers={[
              { label: "Tác giả" },
              { label: "Nội dung" },
              { label: "Kênh" },
              { label: "Chủ đề" },
              { label: "Cảm xúc" },
            ]}
            rows={data.items.map((mention) => {
              const sentiment =
                mention.sentiment === "positive" ||
                mention.sentiment === "neutral" ||
                mention.sentiment === "negative"
                  ? mention.sentiment
                  : null;
              return [
                <div key="author">
                  <div className="font-medium">{mention.authorName ?? "Ẩn danh"}</div>
                  <div className="text-xs text-muted-foreground">
                    {KIND_LABELS[mention.kind] ?? mention.kind}
                    <span className="mx-1">·</span>
                    {formatRelativeTime(mention.publishedAt)}
                  </div>
                </div>,
                <button
                  key="text"
                  type="button"
                  className="max-w-md text-left"
                  onClick={() =>
                    setThread({
                      rootId: mention.rootItemId ?? mention.contentItemId,
                      focusId: mention.contentItemId,
                    })
                  }
                >
                  <span className="line-clamp-3">
                    <HighlightTerms
                      text={mention.text || "(không có chữ)"}
                      terms={mention.matchedTerms}
                    />
                  </span>
                </button>,
                mention.sourceName ?? "—",
                mention.topic?.name ?? "—",
                sentiment ? (
                  <SentimentPill
                    key="sentiment"
                    sentiment={SENTIMENT_PILL[sentiment]}
                    label={AQUA_SENTIMENT_LABEL[SENTIMENT_PILL[sentiment]]}
                  />
                ) : (
                  "—"
                ),
              ];
            })}
          />
        ) : (
          <MetricsEmpty>
            {isPending ? "Đang tải…" : "Không có đề cập nào khớp bộ lọc trong kỳ này."}
          </MetricsEmpty>
        )}
        {data && data.total > 0 ? (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
              Trước
            </Button>
            <span>
              {page}/{pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => update({ page: page + 1 })}
            >
              Sau
            </Button>
          </div>
        ) : null}
      </ReportPanel>

      <MentionThreadSheet
        scope={scope}
        rootId={thread?.rootId ?? null}
        focusId={thread?.focusId ?? null}
        canEdit={false}
        onClose={() => setThread(null)}
      />
    </div>
  );
}

function SentimentButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Button type="button" size="sm" variant={pressed ? "default" : "outline"} aria-pressed={pressed} onClick={onClick}>
      {children}
    </Button>
  );
}
