"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type {
  AdminCollectRunRow,
  AdminSourceRow,
  PageResult,
} from "@/lib/admin-console/types";
import { SYNTHETIC_CONFIG } from "@/lib/personas/config";
import {
  generateFormSchema,
  type GenerateBody,
  type GenerateFormValues,
} from "@/lib/personas/schema";
import type { PanelRow, StartedGeneration } from "@/lib/personas/types";

import { AdminCollectRunsTable } from "./admin-collect-runs-table";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminQueryState } from "./admin-query-state";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";
import { sendAdminJson } from "./send-admin-json";

const NO_STYLE_SOURCE = "none";
const SOURCE_LIST_ID = "synthetic-source-names";
const RECENT_RUNS_FILTERS = { connector: "synthetic-threads", page: 1 } as const;

const DEFAULTS: GenerateFormValues = {
  panelId: "",
  sourceName: "",
  brief: "",
  posts: 10,
  minComments: 0,
  maxComments: 12,
  hours: 24,
  styleSourceId: NO_STYLE_SOURCE,
  distractors: "",
};

function toBody(values: GenerateFormValues): GenerateBody {
  return {
    panelId: values.panelId,
    sourceName: values.sourceName,
    brief: values.brief,
    posts: values.posts,
    minComments: values.minComments,
    maxComments: values.maxComments,
    hours: values.hours,
    styleSourceId: values.styleSourceId === NO_STYLE_SOURCE ? undefined : values.styleSourceId,
    distractors: values.distractors
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

export function AdminGeneratePage() {
  const queryClient = useQueryClient();

  const panels = useQuery({
    queryKey: adminQueryKeys.panels(),
    queryFn: () => fetchAdminJson<{ items: PanelRow[] }>("/api/admin/persona-panels"),
  });
  const sources = useQuery({
    queryKey: adminQueryKeys.sources(),
    queryFn: () => fetchAdminJson<{ items: AdminSourceRow[] }>("/api/admin/sources"),
  });
  const runs = useQuery({
    queryKey: adminQueryKeys.collectRuns(RECENT_RUNS_FILTERS),
    queryFn: () =>
      fetchAdminJson<PageResult<AdminCollectRunRow>>("/api/admin/collect-runs", RECENT_RUNS_FILTERS),
    refetchInterval: 5_000,
  });

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: DEFAULTS,
  });

  const generate = useMutation({
    mutationFn: (values: GenerateFormValues) =>
      sendAdminJson<StartedGeneration>("/api/admin/synthetic/generate", "POST", toBody(values)),
    onSuccess: async (result) => {
      toast.add({
        title: `Started ${result.collectRunIds.length} run(s) for ${result.threadsPerRun.reduce((a, b) => a + b, 0)} thread(s).`,
        type: "success",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.sources() }),
        queryClient.invalidateQueries({ queryKey: ["admin", "collect-runs"] }),
      ]);
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  const allSources = sources.data?.items ?? [];
  const syntheticNames = allSources
    .filter((source) => source.origin === "synthetic" && source.name)
    .map((source) => source.name as string);
  const styleOptions = [
    { value: NO_STYLE_SOURCE, label: "None (model's own voice)" },
    ...allSources
      .filter((source) => source.origin !== "synthetic" && source.comments > 0)
      .map((source) => ({
        value: source.id,
        label: `${source.name ?? source.url ?? source.id} · ${source.comments} comments`,
      })),
  ];
  const panelOptions = (panels.data?.items ?? []).map((panel) => ({
    value: panel.id,
    label: `${panel.name} (${panel.memberCount})`,
  }));

  const posts = form.watch("posts");
  const maxThreads = SYNTHETIC_CONFIG.maxThreadsPerRun;
  const runCount = Number.isFinite(posts) && posts > 0 ? Math.ceil(posts / maxThreads) : 0;

  return (
    <div className="space-y-8">
      <AdminSection
        title="Generate synthetic data"
        description="Writes posts, comments and replies as the personas of a panel into a synthetic source (origin = synthetic). Existing data is not touched."
      >
        {!panels.data ? (
          <AdminQueryState isPending={panels.isPending} error={panels.error} />
        ) : (
          <form
            className="max-w-2xl space-y-6"
            onSubmit={form.handleSubmit((values) => generate.mutate(values))}
          >
            <FieldGroup>
              <FormFieldSelect
                control={form.control}
                name="panelId"
                label="Panel"
                options={panelOptions}
                placeholder="Pick a panel"
                description="Who writes. Create one under Panels."
              />
              <FormFieldText
                control={form.control}
                name="sourceName"
                label="Synthetic source"
                placeholder="Review BĐS giả"
                list={SOURCE_LIST_ID}
                description="A fake group. The same name reuses the same source; a new name creates one."
              />
              <datalist id={SOURCE_LIST_ID}>
                {syntheticNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <FormFieldTextarea
                control={form.control}
                name="brief"
                label="Brief"
                rows={3}
                placeholder="Chủ đầu tư dự án X thông báo lùi bàn giao 6 tháng"
                description="What happened. Goes into every prompt; the model is told not to invent details beyond it."
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <FormFieldText control={form.control} name="posts" label="Posts" type="number" />
                <FormFieldText control={form.control} name="minComments" label="Min comments" type="number" />
                <FormFieldText control={form.control} name="maxComments" label="Max comments" type="number" />
                <FormFieldText control={form.control} name="hours" label="Spread over (h)" type="number" />
              </div>
              <FormFieldSelect
                control={form.control}
                name="styleSourceId"
                label="Voice examples"
                options={styleOptions}
                description="Real comments of this source are shown to the model as examples of how people write."
              />
              <FormFieldTextarea
                control={form.control}
                name="distractors"
                label="Look-alike sentences"
                rows={3}
                placeholder="La Pura thơm quá, mình dùng nước hoa này 2 năm rồi"
                description="Optional, one per line. Mixed in as noise comments with the same name but another meaning."
              />
            </FieldGroup>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={generate.isPending}>
                {generate.isPending ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : null}
                Generate
              </Button>
              <span className="text-xs text-muted-foreground">
                {runCount > 0
                  ? `${runCount} run(s) of up to ${maxThreads} threads each`
                  : null}
              </span>
            </div>

            {generate.data ? (
              <p className="text-sm">
                Started.{" "}
                <Link href={`/admin/sources/${generate.data.sourceId}`} className="underline">
                  Open the source
                </Link>
                , or watch the runs below.
              </p>
            ) : null}
          </form>
        )}
      </AdminSection>

      <AdminSection
        title="Recent synthetic runs"
        description="connector = synthetic-threads. Refreshes every 5 seconds."
        actions={
          <Link
            href="/admin/collect-runs?connector=synthetic-threads"
            className="text-sm underline"
          >
            All runs
          </Link>
        }
      >
        {runs.data ? (
          <AdminCollectRunsTable rows={runs.data.items} />
        ) : (
          <AdminQueryState isPending={runs.isPending} error={runs.error} />
        )}
      </AdminSection>
    </div>
  );
}
