"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormFieldText } from "@/components/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { createLabelSampleBodySchema } from "@/lib/mentions/schema";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import { KIND_LABELS, formatDateTime, formatPercent } from "./mention-labels";
import {
  useCreateLabelSample,
  useLabelSampleTask,
  useLabelSamples,
  useMatchEvaluation,
  useSetItemLabel,
  type MentionsApiScope,
} from "./use-mentions-api";

export function LabelSamplePage({
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

  const mentionsHref = getProjectNavHref(workspaceIndex, projectIndex, "mentions");
  if (project.isDemo) {
    return <p className="px-7 py-5 text-sm text-muted-foreground">Project demo không gán nhãn được.</p>;
  }

  return (
    <LabelSampleWorkspace
      scope={{ workspaceId: workspace.id, projectId: project.id }}
      canEdit={hasMinWorkspacePermission(workspace.permission, "edit")}
      mentionsHref={mentionsHref}
    />
  );
}

function LabelSampleWorkspace({
  scope,
  canEdit,
  mentionsHref,
}: {
  scope: MentionsApiScope;
  canEdit: boolean;
  mentionsHref: string;
}) {
  const { data: samples, isLoading } = useLabelSamples(scope);
  const [chosen, setChosen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const sampleId = chosen ?? samples?.items[0]?.id ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 md:px-7">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={mentionsHref} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-3.5" /> Mentions
          </Link>
          <h1 className="font-heading text-xl font-bold">Gán nhãn mẫu</h1>
          <p className="text-[13px] text-muted-foreground">
            Mẫu ngẫu nhiên gồm mention, ứng viên bị loại và nội dung không khớp. Chỉ trả lời: nội dung này
            có nói về đối tượng của project không? Kết quả của hệ thống được ẩn để không ảnh hưởng.
          </p>
        </div>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={() => setCreating((value) => !value)}>
            Tạo mẫu mới
          </Button>
        ) : null}
      </div>

      {creating || (!isLoading && samples?.items.length === 0) ? (
        canEdit ? (
          <CreateSampleForm
            scope={scope}
            onCreated={(id) => {
              setChosen(id);
              setCreating(false);
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có mẫu nào.</p>
        )
      ) : null}

      {samples && samples.items.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {samples.items.map((sample) => (
            <Button
              key={sample.id}
              size="xs"
              variant={sample.id === sampleId ? "default" : "outline"}
              onClick={() => setChosen(sample.id)}
            >
              {sample.name} · {sample.labeled}/{sample.size}
            </Button>
          ))}
        </div>
      ) : null}

      {sampleId ? <LabelTask key={sampleId} scope={scope} sampleId={sampleId} canEdit={canEdit} /> : null}
    </div>
  );
}

const createFormSchema = createLabelSampleBodySchema.extend({
  mentions: z.number({ error: "Nhập số." }).int().min(0).max(500),
  unmatched: z.number({ error: "Nhập số." }).int().min(0).max(500),
});

function CreateSampleForm({
  scope,
  onCreated,
}: {
  scope: MentionsApiScope;
  onCreated: (sampleId: string) => void;
}) {
  const create = useCreateLabelSample(scope);
  const form = useForm<z.input<typeof createFormSchema>, unknown, z.output<typeof createFormSchema>>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { mentions: 100, unmatched: 50 },
  });

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border px-4 py-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      onSubmit={form.handleSubmit(async (values) => {
        const sample = await create.mutateAsync(values);
        onCreated(sample.id);
      })}
    >
      <FormFieldText
        control={form.control}
        name="mentions"
        type="number"
        label="Từ mention và ứng viên bị loại"
        description="Chia theo tỉ lệ, ít nhất 10 ứng viên bị loại nếu có"
      />
      <FormFieldText
        control={form.control}
        name="unmatched"
        type="number"
        label="Từ nội dung không khớp"
        description="Để ước tính số bị bỏ sót (recall)"
      />
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? <Loader2Icon className="animate-spin" /> : null}
        Tạo mẫu
      </Button>
    </form>
  );
}

function LabelTask({
  scope,
  sampleId,
  canEdit,
}: {
  scope: MentionsApiScope;
  sampleId: string;
  canEdit: boolean;
}) {
  const [cursor, setCursor] = useState({ position: 0, next: true });
  const { data: task, isFetching } = useLabelSampleTask(scope, sampleId, cursor.position, cursor.next);
  const setLabel = useSetItemLabel(scope);
  const done = task && !task.item;

  const answer = (value: boolean) => {
    if (!task?.item || !canEdit) return;
    setLabel.mutate(
      { contentItemId: task.item.contentItemId, isRelevant: value, sampleId },
      { onSuccess: () => setCursor({ position: task.position + 1, next: true }) },
    );
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (!task?.item || setLabel.isPending) return;
      const key = event.key.toLowerCase();
      if (key === "y") answer(true);
      else if (key === "n") answer(false);
      else if (key === "s") setCursor({ position: task.position + 1, next: true });
      else if (event.key === "ArrowLeft" && task.position > 0) {
        setCursor({ position: task.position - 1, next: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!task) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" /> Đang tải…
      </p>
    );
  }

  const { sample } = task;
  const progress = sample.size ? Math.round((sample.labeled / sample.size) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {sample.name}: {sample.labeled}/{sample.size} đã gán nhãn
          </span>
          {!sample.current ? <span className="text-destructive">Cấu hình đã đổi sau khi lấy mẫu</span> : null}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {done ? (
        <SampleResult scope={scope} sampleId={sampleId} onRestart={() => setCursor({ position: 0, next: true })} />
      ) : (
        <section className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4">
          {task.root ? (
            <div className="rounded-xl bg-muted px-3 py-2 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Bài gốc</p>
              <p className="line-clamp-6 whitespace-pre-line">{task.root.text || "(không có chữ)"}</p>
            </div>
          ) : null}
          {task.parent ? (
            <div className="ml-4 rounded-xl border border-border px-3 py-2 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Đang trả lời</p>
              <p className="line-clamp-3 whitespace-pre-line">{task.parent.text}</p>
            </div>
          ) : null}
          <div className={task.root ? "ml-4" : undefined}>
            <p className="mb-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                #{task.position + 1} · {KIND_LABELS[task.item!.kind] ?? task.item!.kind}
              </span>
              <span>{task.item!.authorName ?? "—"}</span>
              <span>· {task.item!.sourceName ?? "—"}</span>
              <span>· {formatDateTime(task.item!.publishedAt)}</span>
              {task.item!.url ? (
                <a href={task.item!.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
                  <ExternalLinkIcon className="size-3" /> Mở
                </a>
              ) : null}
            </p>
            <p className="text-base whitespace-pre-line">{task.item!.text || "(không có chữ)"}</p>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant="ghost"
                disabled={task.position === 0}
                onClick={() => setCursor({ position: task.position - 1, next: false })}
              >
                ← Trước
              </Button>
              <div className="flex gap-2">
                <Button
                  variant={task.label === true ? "default" : "outline"}
                  disabled={setLabel.isPending || isFetching}
                  onClick={() => answer(true)}
                >
                  Có liên quan (Y)
                </Button>
                <Button
                  variant={task.label === false ? "destructive" : "outline"}
                  disabled={setLabel.isPending || isFetching}
                  onClick={() => answer(false)}
                >
                  Không (N)
                </Button>
                <Button
                  variant="ghost"
                  disabled={setLabel.isPending || isFetching}
                  onClick={() => setCursor({ position: task.position + 1, next: true })}
                >
                  Bỏ qua (S)
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function SampleResult({
  scope,
  sampleId,
  onRestart,
}: {
  scope: MentionsApiScope;
  sampleId: string;
  onRestart: () => void;
}) {
  const { data } = useMatchEvaluation(scope, sampleId);

  return (
    <section className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4">
      <h2 className="text-base font-semibold">Không còn mục chưa gán nhãn</h2>
      {data ? (
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <span>Precision: <b>{formatPercent(data.precision)}</b></span>
          <span>Recall (ước tính): <b>{formatPercent(data.recall)}</b></span>
          {data.precisionByMatchType.map((row) => (
            <span key={row.matchType} className="text-muted-foreground">
              Precision {row.matchType === "direct" ? "nhắc tên" : "ngữ cảnh"}: {formatPercent(row.precision)} (n={row.labeled})
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Mục đã bỏ qua vẫn chưa có nhãn; bắt đầu lại để gán nốt.
      </p>
      <div>
        <Button size="sm" variant="outline" onClick={onRestart}>
          Bắt đầu lại từ đầu mẫu
        </Button>
      </div>
    </section>
  );
}
