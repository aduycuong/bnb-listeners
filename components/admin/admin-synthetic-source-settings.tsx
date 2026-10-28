"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlayIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { AdminSourceDetail } from "@/lib/admin-console/types";
import {
  toSyntheticSourceConfig,
  type SyntheticSourceFormValues,
  type UpdateSyntheticSourceBody,
} from "@/lib/personas/schema";
import type { RunSyntheticSourceResult } from "@/lib/personas/types";

import {
  AdminSyntheticSourceForm,
  toSyntheticSourceFormValues,
} from "./admin-synthetic-source-form";
import { sendAdminJson } from "./send-admin-json";

/** Schedule config form of a synthetic source. */
export function AdminSyntheticSourceSettings({ source }: { source: AdminSourceDetail }) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (values: SyntheticSourceFormValues) =>
      sendAdminJson(`/api/admin/synthetic/sources/${source.id}`, "PATCH", {
        name: values.name,
        config: toSyntheticSourceConfig(values),
      } satisfies UpdateSyntheticSourceBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.add({ title: "Synthetic schedule saved.", type: "success" });
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <div className="max-w-2xl">
      <AdminSyntheticSourceForm
        mode="edit"
        defaultValues={toSyntheticSourceFormValues(source.name, source.syntheticConfig)}
        onSubmit={(values) => save.mutate(values)}
        actions={
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            Save changes
          </Button>
        }
      />
    </div>
  );
}

/** Starts one run from the saved config, outside the schedule. */
export function AdminRunSyntheticSourceButton({ source }: { source: AdminSourceDetail }) {
  const queryClient = useQueryClient();

  const run = useMutation({
    mutationFn: () =>
      sendAdminJson<RunSyntheticSourceResult>(`/api/admin/synthetic/sources/${source.id}/run`, "POST"),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.add(
        result.collectRunId
          ? { title: "Run started.", type: "success" }
          : { title: "A run of this source is still pending or running.", type: "info" },
      );
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!source.syntheticConfig || run.isPending}
      onClick={() => run.mutate()}
    >
      {run.isPending ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <PlayIcon data-icon="inline-start" />
      )}
      Run now
    </Button>
  );
}
