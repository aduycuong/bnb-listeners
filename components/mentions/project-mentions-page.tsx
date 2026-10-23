"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useTopicsList } from "@/components/topics/use-topics-api";
import { Input } from "@/components/ui/input";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref, PROJECT_MANAGE_MENTIONS_SEGMENT } from "@/lib/dashboard/nav-items";
import type { ListMentionsQuery } from "@/lib/mentions/schema";
import type { ProjectConfigDetail } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import { SENTIMENT_LABELS, SENTIMENTS } from "@/lib/enrichment/config";
import { caseExtractionSchemas, getCaseTemplate } from "@/lib/projects/case-templates";
import { isAvailableProjectCase } from "@/lib/projects/project-cases";

import { MatchEvaluationCard } from "./match-evaluation-card";
import { MentionAdminTable } from "./mention-admin-table";
import { MentionFilterSelect } from "./mention-filter-select";
import { MentionThreadSheet } from "./mention-thread-sheet";
import { useMentionsList, type MentionsApiScope } from "./use-mentions-api";

const ALL = "all";

/** Mentions list for a project. */
export function ProjectMentionsPage({
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
    <MentionsList
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      projectName={project.name}
      canEdit={hasMinWorkspacePermission(workspace.permission, "edit")}
      labelHref={`${getProjectNavHref(workspaceIndex, projectIndex, PROJECT_MANAGE_MENTIONS_SEGMENT)}/label`}
    />
  );
}

function MentionsList({
  scope,
  projectName,
  canEdit,
  labelHref,
}: {
  scope: MentionsApiScope;
  projectName: string;
  canEdit: boolean;
  labelHref: string;
}) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ListMentionsQuery>({
    relevance: "relevant",
    page: 1,
    topicId: searchParams.get("topicId") ?? undefined,
    sourceId: searchParams.get("sourceId") ?? undefined,
    authorId: searchParams.get("authorId") ?? undefined,
  });
  const [search, setSearch] = useState("");
  const [thread, setThread] = useState<{ rootId: string; focusId: string } | null>(null);
  const { data, isFetching, error } = useMentionsList(scope, filters);
  const { data: config } = useQuery({
    queryKey: ["project-config", scope.projectId],
    queryFn: async () => {
      const res = await projectFetch(
        scope.workspaceId,
        scope.projectId,
        `/api/projects/${scope.projectId}/config`,
      );
      if (!res.ok) throw new Error("Không tải được cấu hình.");
      return (await res.json()) as ProjectConfigDetail;
    },
  });
  const { data: topicList } = useTopicsList(scope, true);
  const extractionSchemas =
    config && isAvailableProjectCase(config.case)
      ? caseExtractionSchemas(getCaseTemplate(config.case, config.caseVersion))
      : [];
  const entityNames = new Map(config?.entities.map((entity) => [entity.id, entity.name]) ?? []);
  const aspectNames = new Map(
    config?.aspects.map((aspect) => [aspect.id, { key: aspect.key, name: aspect.name }]) ?? [],
  );
  const update = (patch: Partial<ListMentionsQuery>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const page = data?.page ?? 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-5 md:px-7">
      <div>
        <h1 className="font-heading text-xl font-bold">Mentions</h1>
        <p className="text-[13px] text-muted-foreground">
          {projectName} · nội dung khớp với project. Mở rộng để đọc hết. Menu cạnh Xem thread để gán liên quan hoặc sửa.
        </p>
      </div>

      <MatchEvaluationCard scope={scope} labelHref={labelHref} />

      <div className="flex flex-wrap items-center gap-2">
        <MentionFilterSelect
          label="Liên quan"
          value={filters.relevance ?? "relevant"}
          options={[
            { value: "relevant", label: "Có liên quan" },
            { value: "rejected", label: "Bị loại" },
            { value: ALL, label: "Tất cả ứng viên" },
          ]}
          onChange={(value) => update({ relevance: value as ListMentionsQuery["relevance"] })}
        />
        <MentionFilterSelect
          label="Cách khớp"
          value={filters.matchType ?? ALL}
          options={[
            { value: ALL, label: "Mọi cách khớp" },
            { value: "direct", label: "Nhắc tên" },
            { value: "context", label: "Ngữ cảnh" },
            { value: "manual", label: "Thêm tay" },
          ]}
          onChange={(value) => update({ matchType: value as ListMentionsQuery["matchType"] })}
        />
        <MentionFilterSelect
          label="Loại"
          value={filters.kind ?? ALL}
          options={[
            { value: ALL, label: "Mọi loại" },
            { value: "post", label: "Bài" },
            { value: "comment", label: "Bình luận" },
            { value: "reply", label: "Trả lời" },
          ]}
          onChange={(value) => update({ kind: value as ListMentionsQuery["kind"] })}
        />
        {config && config.entities.length > 1 ? (
          <MentionFilterSelect
            label="Đối tượng"
            value={filters.entityId ?? ALL}
            options={[
              { value: ALL, label: "Mọi đối tượng" },
              ...config.entities.map((entity) => ({ value: entity.id, label: entity.name })),
            ]}
            onChange={(value) => update({ entityId: value === ALL ? undefined : value })}
          />
        ) : null}
        <MentionFilterSelect
          label="Cảm xúc"
          value={filters.sentiment ?? ALL}
          options={[
            { value: ALL, label: "Mọi cảm xúc" },
            ...SENTIMENTS.map((value) => ({ value, label: SENTIMENT_LABELS[value] })),
          ]}
          onChange={(value) => update({ sentiment: value as ListMentionsQuery["sentiment"] })}
        />
        {config && config.aspects.length > 0 ? (
          <MentionFilterSelect
            label="Khía cạnh"
            value={filters.aspectId ?? ALL}
            options={[
              { value: ALL, label: "Mọi khía cạnh" },
              ...config.aspects.map((aspect) => ({ value: aspect.id, label: aspect.name })),
            ]}
            onChange={(value) => update({ aspectId: value === ALL ? undefined : value })}
          />
        ) : null}
        {topicList && topicList.items.length > 0 ? (
          <MentionFilterSelect
            label="Topic"
            value={filters.topicId ?? ALL}
            options={[
              { value: ALL, label: "Mọi topic" },
              ...topicList.items.map((topic) => ({ value: topic.id, label: topic.name })),
            ]}
            onChange={(value) => update({ topicId: value === ALL ? undefined : value })}
          />
        ) : null}
        {extractionSchemas.length > 0 ? (
          <MentionFilterSelect
            label="Trích xuất"
            value={filters.schemaKey && filters.schemaKey !== ALL ? filters.schemaKey : ALL}
            options={[
              { value: ALL, label: "Mọi trích xuất" },
              ...extractionSchemas.map((schema) => ({ value: schema.key, label: schema.label })),
            ]}
            onChange={(value) => update({ schemaKey: value === ALL ? undefined : value })}
          />
        ) : null}
        <MentionFilterSelect
          label="Nhãn"
          value={filters.labeled ?? ALL}
          options={[
            { value: ALL, label: "Có và chưa có nhãn" },
            { value: "yes", label: "Đã gán nhãn" },
            { value: "no", label: "Chưa gán nhãn" },
          ]}
          onChange={(value) => update({ labeled: value as ListMentionsQuery["labeled"] })}
        />
        <Input
          type="date"
          className="h-8 w-auto"
          aria-label="Từ ngày"
          value={filters.from ?? ""}
          onChange={(event) => update({ from: event.target.value || undefined })}
        />
        <Input
          type="date"
          className="h-8 w-auto"
          aria-label="Đến ngày"
          value={filters.to ?? ""}
          onChange={(event) => update({ to: event.target.value || undefined })}
        />
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: search.trim() || undefined });
          }}
        >
          <Input
            className="h-8 min-w-40 flex-1"
            placeholder="Tìm trong nội dung"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit" size="sm" variant="outline">
            Tìm
          </Button>
        </form>
      </div>

      {filters.sourceId || filters.authorId ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {filters.sourceId ? (
            <Button size="sm" variant="secondary" onClick={() => update({ sourceId: undefined })}>
              Nguồn: {data?.items[0]?.sourceName ?? "đang lọc"} ✕
            </Button>
          ) : null}
          {filters.authorId ? (
            <Button size="sm" variant="secondary" onClick={() => update({ authorId: undefined })}>
              Tác giả: {data?.items[0]?.authorName ?? "đang lọc"} ✕
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <MentionAdminTable
        scope={scope}
        items={data?.items ?? []}
        loading={!data}
        empty={data?.items.length === 0}
        canEdit={canEdit}
        entityNames={entityNames}
        aspectNames={aspectNames}
        aspects={config?.aspects ?? []}
        onOpenThread={(mention) =>
          setThread({
            rootId: mention.rootItemId ?? mention.contentItemId,
            focusId: mention.contentItemId,
          })
        }
      />

      {data ? (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {data.total.toLocaleString("vi-VN")} mention{isFetching ? " · đang tải…" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => update({ page: page - 1 })}
            >
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
        </div>
      ) : null}

      <MentionThreadSheet
        scope={scope}
        rootId={thread?.rootId ?? null}
        focusId={thread?.focusId ?? null}
        canEdit={canEdit}
        presentation="dialog"
        onClose={() => setThread(null)}
      />
    </div>
  );
}
