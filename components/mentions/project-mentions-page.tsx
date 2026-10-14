"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, MessagesSquareIcon } from "lucide-react";
import { useState } from "react";

import { ProjectSectionPage } from "@/components/projects/project-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import type { ListMentionsQuery } from "@/lib/mentions/schema";
import type { ProjectConfigDetail } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import { SENTIMENT_LABELS, SENTIMENTS } from "@/lib/enrichment/config";

import { HighlightTerms } from "./highlight-terms";
import { MatchEvaluationCard } from "./match-evaluation-card";
import { MentionEnrichment } from "./mention-enrichment";
import { MentionFilterSelect } from "./mention-filter-select";
import { MentionLabelButtons } from "./mention-label-buttons";
import {
  KIND_LABELS,
  MATCH_TIER_LABELS,
  MATCH_TYPE_LABELS,
  formatDateTime,
} from "./mention-labels";
import { MentionThreadSheet } from "./mention-thread-sheet";
import { SentimentAspectPicker } from "./sentiment-aspect-picker";
import { useMentionsList, useSetItemLabel, type MentionsApiScope } from "./use-mentions-api";

const ALL = "all";

/** Real projects get the Mentions list; demo projects keep the sample page. */
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

  if (project.isDemo) {
    return (
      <ProjectSectionPage
        workspaceIndexParam={workspaceIndexParam}
        projectIndexParam={projectIndexParam}
        section="mentions"
      />
    );
  }

  return (
    <MentionsList
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      projectName={project.name}
      canEdit={hasMinWorkspacePermission(workspace.permission, "edit")}
      labelHref={`${getProjectNavHref(workspaceIndex, projectIndex, "mentions")}/label`}
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
  const [filters, setFilters] = useState<ListMentionsQuery>({ relevance: "relevant", page: 1 });
  const [search, setSearch] = useState("");
  const [thread, setThread] = useState<{ rootId: string; focusId: string } | null>(null);
  const { data, isFetching, error } = useMentionsList(scope, filters);
  const setLabel = useSetItemLabel(scope);
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
  const entityNames = new Map(config?.entities.map((entity) => [entity.id, entity.name]) ?? []);
  const aspectNames = new Map(
    config?.aspects.map((aspect) => [aspect.id, { key: aspect.key, name: aspect.name }]) ?? [],
  );
  const [editing, setEditing] = useState<string | null>(null);

  const update = (patch: Partial<ListMentionsQuery>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  const page = data?.page ?? 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 md:px-7">
      <div>
        <h1 className="font-heading text-xl font-bold">Mentions</h1>
        <p className="text-[13px] text-muted-foreground">
          {projectName} · nội dung khớp với project. Bấm vào một mục để xem cả thread.
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

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <div className="flex flex-col gap-2">
        {data?.items.length === 0 ? (
          <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
            Không có mention nào khớp bộ lọc.
          </p>
        ) : null}
        {data?.items.map((mention) => (
          <article
            key={mention.id}
            className="flex flex-col gap-2 rounded-2xl border border-border px-3 py-3 hover:border-primary/40"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{KIND_LABELS[mention.kind] ?? mention.kind}</span>
              <span>{mention.authorName ?? "—"}</span>
              <span>· {mention.sourceName ?? "—"}</span>
              <span>· {formatDateTime(mention.publishedAt)}</span>
              <Badge variant="outline">
                {MATCH_TYPE_LABELS[mention.matchType]} · {MATCH_TIER_LABELS[mention.matchTier]}
              </Badge>
              {!mention.isRelevant ? <Badge variant="secondary">Bị loại</Badge> : null}
              {mention.matchedEntityIds.map((id) =>
                entityNames.get(id) ? (
                  <Badge key={id} variant="outline">
                    {entityNames.get(id)}
                  </Badge>
                ) : null,
              )}
              {mention.url ? (
                <a
                  href={mention.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 hover:text-foreground"
                >
                  <ExternalLinkIcon className="size-3" /> Mở
                </a>
              ) : null}
            </div>
            {mention.rootText ? (
              <p className="line-clamp-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">
                Trong bài: {mention.rootText}
              </p>
            ) : null}
            <button
              type="button"
              className="text-left text-sm whitespace-pre-line"
              onClick={() =>
                setThread({
                  rootId: mention.rootItemId ?? mention.contentItemId,
                  focusId: mention.contentItemId,
                })
              }
            >
              <span className="line-clamp-4">
                <HighlightTerms text={mention.text || "(không có chữ)"} terms={mention.matchedTerms} />
              </span>
            </button>
            {mention.matchReason ? (
              <p className="text-xs text-muted-foreground">AI: {mention.matchReason}</p>
            ) : null}
            <MentionEnrichment mention={mention} aspectNames={aspectNames} />
            {editing === mention.id && config ? (
              <div className="rounded-xl bg-muted px-3 py-2">
                <SentimentAspectPicker
                  aspects={config.aspects}
                  sentiment={mention.labelSentiment ?? mention.sentiment}
                  aspectKeys={
                    mention.labelAspectKeys ??
                    mention.aspects
                      .map((aspect) => aspectNames.get(aspect.aspectId)?.key)
                      .filter((key): key is string => Boolean(key))
                  }
                  disabled={setLabel.isPending}
                  onSentiment={(sentiment) =>
                    setLabel.mutate({
                      contentItemId: mention.contentItemId,
                      isRelevant: mention.label ?? true,
                      sentiment,
                    })
                  }
                  onAspects={(aspectKeys) =>
                    setLabel.mutate({
                      contentItemId: mention.contentItemId,
                      isRelevant: mention.label ?? true,
                      aspectKeys,
                    })
                  }
                />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {canEdit ? (
                <MentionLabelButtons
                  compact
                  label={mention.label}
                  disabled={setLabel.isPending}
                  onChange={(value) =>
                    setLabel.mutate({ contentItemId: mention.contentItemId, isRelevant: value })
                  }
                />
              ) : (
                <span />
              )}
              <div className="flex gap-1">
              {canEdit && mention.isRelevant ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setEditing(editing === mention.id ? null : mention.id)}
                >
                  {editing === mention.id ? "Xong" : "Sửa cảm xúc, khía cạnh"}
                </Button>
              ) : null}
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() =>
                  setThread({
                    rootId: mention.rootItemId ?? mention.contentItemId,
                    focusId: mention.contentItemId,
                  })
                }
              >
                <MessagesSquareIcon />
                Xem thread
              </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

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
        onClose={() => setThread(null)}
      />
    </div>
  );
}
