"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon, MergeIcon, MessagesSquareIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import { MentionFilterSelect } from "@/components/mentions/mention-filter-select";
import { ProjectSectionPage } from "@/components/projects/project-section-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import type { ProjectConfigDetail } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { topicFormSchema, type TopicFormValues } from "@/lib/topics/schema";
import type { TopicListItem } from "@/lib/topics/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import {
  useMergeTopic,
  useTopicsList,
  useUpdateTopic,
  type TopicsApiScope,
} from "./use-topics-api";

/** Real projects get the Topics list; demo projects keep the sample page. */
export function ProjectTopicsPage({
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
        section="topics"
      />
    );
  }

  return (
    <TopicsList
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      projectName={project.name}
      canEdit={hasMinWorkspacePermission(workspace.permission, "edit")}
      mentionsHref={getProjectNavHref(workspaceIndex, projectIndex, "mentions")}
    />
  );
}

function formatGrowth(topic: TopicListItem) {
  if (topic.previous7Days === 0) return topic.last7Days > 0 ? "mới" : "—";
  const change = Math.round(((topic.last7Days - topic.previous7Days) / topic.previous7Days) * 100);
  return `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}%`;
}

function SentimentBar({ sentiments }: { sentiments: TopicListItem["sentiments"] }) {
  const total = sentiments.positive + sentiments.neutral + sentiments.negative;
  if (total === 0) return null;
  const share = (value: number) => `${(value / total) * 100}%`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-[#0B8A6B]" style={{ width: share(sentiments.positive) }} />
        <div className="bg-muted-foreground/30" style={{ width: share(sentiments.neutral) }} />
        <div className="bg-[#D5402F]" style={{ width: share(sentiments.negative) }} />
      </div>
      <p className="text-xs text-muted-foreground">
        Tích cực {Math.round((sentiments.positive / total) * 100)}% · Tiêu cực{" "}
        {Math.round((sentiments.negative / total) * 100)}%
      </p>
    </div>
  );
}

function TopicsList({
  scope,
  projectName,
  canEdit,
  mentionsHref,
}: {
  scope: TopicsApiScope;
  projectName: string;
  canEdit: boolean;
  mentionsHref: string;
}) {
  const [includeHidden, setIncludeHidden] = useState(false);
  const [editing, setEditing] = useState<TopicListItem | null>(null);
  const [merging, setMerging] = useState<TopicListItem | null>(null);
  const { data, error, isFetching } = useTopicsList(scope, includeHidden);
  const update = useUpdateTopic(scope);
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
  const aspectNames = new Map(config?.aspects.map((aspect) => [aspect.id, aspect.name]) ?? []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 md:px-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">Topics</h1>
          <p className="text-[13px] text-muted-foreground">
            {projectName} · chủ đề gom tự động từ các mention có liên quan.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={includeHidden} onCheckedChange={setIncludeHidden} />
          Hiện topic đã ẩn
        </label>
      </div>

      {data ? (
        <p className="text-xs text-muted-foreground">
          {data.items.length} topic
          {data.waiting > 0 ? ` · ${data.waiting} mention chưa thuộc topic nào` : ""}
          {data.pending > 0 ? ` · ${data.pending} mention đang chờ xử lý` : ""}
          {isFetching ? " · đang tải…" : ""}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {data?.items.length === 0 ? (
        <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          Chưa có topic. Topic được tạo sau khi làm giàu mention, khi đủ mention cùng bàn một chuyện.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {data?.items.map((topic) => (
          <article
            key={topic.id}
            className="grid gap-3 rounded-2xl border border-border px-3 py-3 md:grid-cols-[1fr_200px]"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-semibold">{topic.name}</h2>
                {topic.aspectId && aspectNames.get(topic.aspectId) ? (
                  <Badge variant="secondary">{aspectNames.get(topic.aspectId)}</Badge>
                ) : null}
                {topic.status === "hidden" ? <Badge variant="outline">Đã ẩn</Badge> : null}
              </div>
              {topic.description ? (
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              ) : null}
              {topic.sampleHints.length ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  Ví dụ: {topic.sampleHints.join(" · ")}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1">
                <Button
                  size="xs"
                  variant="ghost"
                  nativeButton={false}
                  render={<Link href={`${mentionsHref}?topicId=${topic.id}`} />}
                >
                  <MessagesSquareIcon />
                  Xem mention
                </Button>
                {canEdit ? (
                  <>
                    <Button size="xs" variant="ghost" onClick={() => setEditing(topic)}>
                      <PencilIcon />
                      Sửa
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          id: topic.id,
                          status: topic.status === "hidden" ? "active" : "hidden",
                        })
                      }
                    >
                      {topic.status === "hidden" ? <EyeIcon /> : <EyeOffIcon />}
                      {topic.status === "hidden" ? "Hiện" : "Ẩn"}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setMerging(topic)}>
                      <MergeIcon />
                      Gộp vào…
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-lg font-bold">
                  {topic.mentionCount.toLocaleString("vi-VN")}
                </span>
                <span className="text-xs text-muted-foreground">mention</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                <span>7 ngày: {topic.last7Days.toLocaleString("vi-VN")}</span>
                <span
                  className={
                    topic.last7Days >= topic.previous7Days
                      ? "font-semibold text-[#0B8A6B]"
                      : "font-semibold text-[#D5402F]"
                  }
                >
                  {formatGrowth(topic)}
                </span>
              </div>
              <SentimentBar sentiments={topic.sentiments} />
            </div>
          </article>
        ))}
      </div>

      {editing ? (
        <EditTopicDialog scope={scope} topic={editing} onClose={() => setEditing(null)} />
      ) : null}
      {merging && data ? (
        <MergeTopicDialog
          scope={scope}
          topic={merging}
          topics={data.items}
          onClose={() => setMerging(null)}
        />
      ) : null}
    </div>
  );
}

function EditTopicDialog({
  scope,
  topic,
  onClose,
}: {
  scope: TopicsApiScope;
  topic: TopicListItem;
  onClose: () => void;
}) {
  const update = useUpdateTopic(scope);
  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: { name: topic.name, description: topic.description },
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) =>
            update.mutate({ id: topic.id, ...values }, { onSuccess: onClose }),
          )}
        >
          <DialogHeader>
            <DialogTitle>Sửa topic</DialogTitle>
            <DialogDescription>Tên và mô tả do bạn sửa được giữ nguyên ở các lần chạy sau.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <FormFieldText control={form.control} name="name" label="Tên" />
            <FormFieldTextarea control={form.control} name="description" label="Mô tả" rows={3} />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={update.isPending}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MergeTopicDialog({
  scope,
  topic,
  topics,
  onClose,
}: {
  scope: TopicsApiScope;
  topic: TopicListItem;
  topics: TopicListItem[];
  onClose: () => void;
}) {
  const merge = useMergeTopic(scope);
  const options = topics
    .filter((other) => other.id !== topic.id)
    .map((other) => ({ value: other.id, label: `${other.name} (${other.mentionCount})` }));
  const [intoId, setIntoId] = useState(options[0]?.value ?? "");

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gộp “{topic.name}”</DialogTitle>
          <DialogDescription>
            {topic.mentionCount} mention được chuyển sang topic bạn chọn; topic này sẽ không còn trong danh sách.
          </DialogDescription>
        </DialogHeader>
        {options.length ? (
          <MentionFilterSelect label="Gộp vào" value={intoId} options={options} onChange={setIntoId} />
        ) : (
          <p className="text-sm text-muted-foreground">Không có topic nào khác để gộp vào.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!intoId || merge.isPending}
            onClick={() => merge.mutate({ id: topic.id, intoId }, { onSuccess: onClose })}
          >
            Gộp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
