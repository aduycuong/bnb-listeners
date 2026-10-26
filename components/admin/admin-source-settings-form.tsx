"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { AdminSourceDetail } from "@/lib/admin-console/types";
import { ACTIVITY_TIERS, type ActivityTier } from "@/lib/connectors/constants";
import {
  sourceSettingsFormSchema,
  toUpdateSourceSettingsBody,
  type SourceSettingsFormValues,
} from "@/lib/connectors/schema";

import { formatNumber } from "./admin-format";
import { getExpectedPostsPerRun } from "./admin-tier-badge";
import { sendAdminJson } from "./send-admin-json";

const MODE_OPTIONS = [
  { value: "auto", label: "Automatic (from posts per day)" },
  { value: "manual", label: "Manual" },
];

/** Hours between scans for a tier under the rules in use; null for paused. */
function getTierInterval(source: AdminSourceDetail, tier: ActivityTier): number | null {
  if (tier === "paused") return null;
  if (source.intervalRule === "search") return source.tierRules.searchIntervalHours;
  return source.tierRules.intervalHours[tier];
}

/** Name, tier mode and record budgets of a source. */
export function AdminSourceSettingsForm({ source }: { source: AdminSourceDetail }) {
  const queryClient = useQueryClient();
  const { tierRules } = source;

  const tierOptions = ACTIVITY_TIERS.map((tier) => {
    const hours = getTierInterval(source, tier);
    return { value: tier, label: hours === null ? `${tier} · never scanned` : `${tier} · every ${hours}h` };
  });

  const form = useForm<SourceSettingsFormValues>({
    resolver: zodResolver(sourceSettingsFormSchema),
    defaultValues: {
      name: source.name ?? "",
      tierMode: source.tierMode,
      activityTier: source.activityTier,
      monthlyRecordLimit: source.monthlyRecordLimit ?? undefined,
      dailyRecordLimit: source.dailyRecordLimit ?? undefined,
    },
  });
  const [tierMode, activityTier] = useWatch({
    control: form.control,
    name: ["tierMode", "activityTier"],
  });

  const effectiveTier: ActivityTier =
    tierMode === "auto" ? (source.autoTier ?? source.activityTier) : activityTier;
  const intervalHours = getTierInterval(source, effectiveTier);
  const perRun =
    intervalHours !== null && source.intervalRule === "tier"
      ? getExpectedPostsPerRun(source.postsPerDay, intervalHours)
      : null;

  const save = useMutation({
    mutationFn: (values: SourceSettingsFormValues) =>
      sendAdminJson(`/api/admin/sources/${source.id}`, "PATCH", toUpdateSourceSettingsBody(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.add({ title: "Source updated.", type: "success" });
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  return (
    <form
      noValidate
      className="max-w-2xl space-y-6"
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
    >
      <FieldGroup>
        <FormFieldText control={form.control} name="name" label="Name" />
        <FormFieldSelect
          control={form.control}
          name="tierMode"
          label="Tier mode"
          options={MODE_OPTIONS}
          description={
            source.intervalRule === "search"
              ? `A keyword search runs every ${tierRules.searchIntervalHours}h whatever its tier; only paused stops it.`
              : `Automatic: hot ≥ ${tierRules.minPostsPerDay.hot}, normal ≥ ${tierRules.minPostsPerDay.normal} posts/day over ${tierRules.windowDays}d, recomputed after every post run. This source: ${source.postsPerDay} posts/day → ${source.autoTier}.`
          }
        />
        {tierMode === "manual" ? (
          <FormFieldSelect
            control={form.control}
            name="activityTier"
            label="Tier"
            options={tierOptions}
            description="Kept until you switch back to automatic. Paused stops scheduled post runs."
          />
        ) : null}
        <FormFieldText
          control={form.control}
          name="monthlyRecordLimit"
          label="Monthly record limit"
          type="number"
          placeholder="Unlimited"
          description={`Bright Data records per calendar month (UTC) across all runs of this source. Used this month: ${formatNumber(source.usedThisMonth)}. Empty = unlimited.`}
        />
        <FormFieldText
          control={form.control}
          name="dailyRecordLimit"
          label="Daily record limit"
          type="number"
          placeholder="Unlimited"
          description={`Records per day, reset at midnight Vietnam time; posts, refreshes and comments all count. When it is used up, post runs wait for the next day and comment collections wait for the post's next checkpoint. Used today: ${formatNumber(source.usedToday)}. Empty = unlimited.`}
        />
      </FieldGroup>

      <div className="space-y-1 rounded-md bg-muted px-3 py-2 text-sm">
        <p>
          {intervalHours === null
            ? "Will not be scanned on schedule."
            : `Will be scanned every ${intervalHours}h (${effectiveTier}).`}
        </p>
        {perRun !== null && perRun > tierRules.maxRecordsPerRun ? (
          <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            At {source.postsPerDay} posts/day that is about {perRun} posts per run, above the{" "}
            {tierRules.maxRecordsPerRun}-record cap of one run. Posts beyond the cap can be missed;
            pick a shorter interval.
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
        Save changes
      </Button>
    </form>
  );
}
