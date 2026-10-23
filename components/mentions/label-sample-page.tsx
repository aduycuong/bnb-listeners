"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { FormFieldText } from "@/components/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";
import { getProjectNavHref, PROJECT_MANAGE_MENTIONS_SEGMENT } from "@/lib/dashboard/nav-items";
import type { Sentiment } from "@/lib/enrichment/config";
import { createLabelSampleBodySchema } from "@/lib/mentions/schema";
import type { LabelSampleTask } from "@/lib/mentions/types";
import type { ProjectConfigDetail } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

import { KIND_LABELS, formatDateTime, formatPercent } from "./mention-labels";
import { SentimentAspectPicker } from "./sentiment-aspect-picker";
import {
  useCreateLabelSample,
  useEnrichEvaluation,
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

  const mentionsHref = getProjectNavHref(workspaceIndex, projectIndex, PROJECT_MANAGE_MENTIONS_SEGMENT);

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
            Mẫu Match: nội dung có nói về đối tượng của project không. Mẫu Enrich: cảm xúc và khía cạnh của
            mention. Kết quả của hệ thống được ẩn để không ảnh hưởng.
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

      {samples && samples.items.length > 0 ? (
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

      {sampleId ? (
        <LabelTask
          key={sampleId}
          scope={scope}
          sampleId={sampleId}
          canEdit={canEdit}
          aspects={config?.aspects ?? []}
        />
      ) : null}
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
    defaultValues: { kind: "match", mentions: 100, unmatched: 50 },
  });
  const kind = useWatch({ control: form.control, name: "kind" });

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border px-4 py-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      onSubmit={form.handleSubmit(async (values) => {
        const sample = await create.mutateAsync(values);
        onCreated(sample.id);
      })}
    >
      <Controller
        control={form.control}
        name="kind"
        render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange} className="md:col-span-3">
            {[
              { value: "match", label: "Mẫu Match", hint: "Có liên quan hay không, trên mọi loại nội dung" },
              { value: "enrich", label: "Mẫu Enrich", hint: "Cảm xúc và khía cạnh của mention đã làm giàu" },
            ].map((option) => (
              <Field key={option.value} orientation="horizontal">
                <RadioGroupItem value={option.value} id={`sample-kind-${option.value}`} />
                <FieldContent>
                  <FieldLabel htmlFor={`sample-kind-${option.value}`}>
                    {option.label}
                    <span className="ml-2 font-normal text-muted-foreground">{option.hint}</span>
                  </FieldLabel>
                </FieldContent>
              </Field>
            ))}
          </RadioGroup>
        )}
      />
      <FormFieldText
        control={form.control}
        name="mentions"
        type="number"
        label={kind === "enrich" ? "Số mention" : "Từ mention và ứng viên bị loại"}
        description={
          kind === "enrich"
            ? "Lấy ngẫu nhiên trong mention có liên quan đã làm giàu"
            : "Chia theo tỉ lệ, ít nhất 10 ứng viên bị loại nếu có"
        }
      />
      {kind === "enrich" ? (
        <span />
      ) : (
        <FormFieldText
          control={form.control}
          name="unmatched"
          type="number"
          label="Từ nội dung không khớp"
          description="Để ước tính số bị bỏ sót (recall)"
        />
      )}
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
  aspects,
}: {
  scope: MentionsApiScope;
  sampleId: string;
  canEdit: boolean;
  aspects: { key: string; name: string }[];
}) {
  const [cursor, setCursor] = useState({ position: 0, next: true });
  const { data: task, isFetching } = useLabelSampleTask(scope, sampleId, cursor.position, cursor.next);
  const setLabel = useSetItemLabel(scope);
  const done = task && !task.item;
  const enrichMode = task?.sample.kind === "enrich";

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
      if (!task?.item || setLabel.isPending || enrichMode) return;
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
        enrichMode ? (
          <EnrichSampleResult
            scope={scope}
            sampleId={sampleId}
            onRestart={() => setCursor({ position: 0, next: true })}
          />
        ) : (
          <SampleResult scope={scope} sampleId={sampleId} onRestart={() => setCursor({ position: 0, next: true })} />
        )
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

          {canEdit && enrichMode ? (
            <EnrichAnswer
              key={task.item!.contentItemId}
              task={task}
              aspects={aspects}
              busy={setLabel.isPending || isFetching}
              onBack={() => setCursor({ position: task.position - 1, next: false })}
              onSkip={() => setCursor({ position: task.position + 1, next: true })}
              onSave={(value) =>
                setLabel.mutate(
                  { contentItemId: task.item!.contentItemId, sampleId, ...value },
                  { onSuccess: () => setCursor({ position: task.position + 1, next: true }) },
                )
              }
            />
          ) : null}
          {canEdit && !enrichMode ? (
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

type EnrichAnswerValue = {
  isRelevant: boolean;
  sentiment: Sentiment | null;
  aspectKeys: string[] | null;
};

/** Sentiment and aspects of one mention; keys 1/2/3 sentiment, N not relevant, Enter save, S skip. */
function EnrichAnswer({
  task,
  aspects,
  busy,
  onSave,
  onSkip,
  onBack,
}: {
  task: LabelSampleTask;
  aspects: { key: string; name: string }[];
  busy: boolean;
  onSave: (value: EnrichAnswerValue) => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const [sentiment, setSentiment] = useState<Sentiment | null>(
    (task.labelSentiment as Sentiment | null) ?? null,
  );
  const [aspectKeys, setAspectKeys] = useState<string[]>(task.labelAspectKeys ?? []);
  const save = () => {
    if (sentiment) onSave({ isRelevant: true, sentiment, aspectKeys });
  };
  const notRelevant = () => onSave({ isRelevant: false, sentiment: null, aspectKeys: null });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (busy) return;
      const key = event.key.toLowerCase();
      if (key === "1") setSentiment("positive");
      else if (key === "2") setSentiment("neutral");
      else if (key === "3") setSentiment("negative");
      else if (key === "n") notRelevant();
      else if (key === "s") onSkip();
      else if (event.key === "Enter") save();
      else if (event.key === "ArrowLeft" && task.position > 0) onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <SentimentAspectPicker
        aspects={aspects}
        sentiment={sentiment}
        aspectKeys={aspectKeys}
        disabled={busy}
        onSentiment={setSentiment}
        onAspects={setAspectKeys}
        shortcuts
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="ghost" disabled={task.position === 0} onClick={onBack}>
          ← Trước
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={notRelevant}>
            Không liên quan (N)
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onSkip}>
            Bỏ qua (S)
          </Button>
          <Button disabled={busy || !sentiment} onClick={save}>
            Lưu (Enter)
          </Button>
        </div>
      </div>
    </div>
  );
}

function EnrichSampleResult({
  scope,
  sampleId,
  onRestart,
}: {
  scope: MentionsApiScope;
  sampleId: string;
  onRestart: () => void;
}) {
  const { data } = useEnrichEvaluation(scope, sampleId);

  return (
    <section className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4">
      <h2 className="text-base font-semibold">Không còn mục chưa gán nhãn</h2>
      {data ? (
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <span>Sentiment đúng: <b>{formatPercent(data.sentimentAccuracy)}</b></span>
          <span>Khía cạnh F1: <b>{formatPercent(data.aspect.f1)}</b></span>
          {data.byAspect
            .filter((row) => row.support > 0)
            .map((row) => (
              <span key={row.key} className="text-muted-foreground">
                {row.name}: F1 {formatPercent(row.f1)} (n={row.support})
              </span>
            ))}
        </div>
      ) : null}
      <div>
        <Button size="sm" variant="outline" onClick={onRestart}>
          Bắt đầu lại từ đầu mẫu
        </Button>
      </div>
    </section>
  );
}
