"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { TermGroupDeleteDialog } from "@/components/term-groups/term-group-delete-dialog";
import { TermGroupDetailGeneral } from "@/components/term-groups/term-group-detail-general";
import { TermGroupFormDialog } from "@/components/term-groups/term-group-form-dialog";
import { TermGroupMembersSection } from "@/components/term-groups/term-group-members-section";
import {
  termGroupChartQueryKey,
  termGroupMembersQueryKey,
  termGroupQueryKey,
  termGroupTopTermsQueryKey,
  termGroupsQueryKey,
  type TermGroupTopTermsQueryFilters,
} from "@/components/term-groups/term-group-query-keys";
import { TermGroupTopTermsSection } from "@/components/term-groups/term-group-top-terms-section";
import { TermDetailChartSection } from "@/components/terms/term-detail-chart-section";
import type { TermChartQueryFilters } from "@/components/terms/term-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTermGroupHref } from "@/lib/term-groups/term-group-config";
import type {
  ListTermGroupMembersResult,
  ListTermGroupTopTermsResult,
  TermGroupDetail,
  TermGroupTopTermsSort,
} from "@/lib/term-groups/types";
import type {
  TermDetailChartMetric,
  TermDetailChartPeriodPreset,
} from "@/lib/terms/term-detail-chart-config";
import type { GetTermChartResult } from "@/lib/terms/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermGroupDetailPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  groupId: string;
};

async function fetchTermGroup(
  workspaceId: string,
  groupId: string,
): Promise<TermGroupDetail> {
  const res = await workspaceFetch(workspaceId, `/api/term-groups/${groupId}`);
  const data = (await res.json()) as TermGroupDetail & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load term group.");
  }

  return data;
}

async function fetchTermGroupChart(
  workspaceId: string,
  groupId: string,
  filters: TermChartQueryFilters,
): Promise<GetTermChartResult> {
  const params = new URLSearchParams({
    period: filters.period,
    metric: filters.metric,
  });

  if (filters.period === "custom") {
    if (filters.startDate) {
      params.set("startDate", filters.startDate);
    }
    if (filters.endDate) {
      params.set("endDate", filters.endDate);
    }
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/chart?${params.toString()}`,
  );
  const data = (await res.json()) as GetTermChartResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load chart.");
  }

  return data;
}

async function fetchTermGroupTopTerms(
  workspaceId: string,
  groupId: string,
  filters: TermGroupTopTermsQueryFilters,
): Promise<ListTermGroupTopTermsResult> {
  const params = new URLSearchParams({
    period: filters.period,
    sort: filters.sort,
  });

  if (filters.period === "custom") {
    if (filters.startDate) {
      params.set("startDate", filters.startDate);
    }
    if (filters.endDate) {
      params.set("endDate", filters.endDate);
    }
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/top-terms?${params.toString()}`,
  );
  const data = (await res.json()) as ListTermGroupTopTermsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load top terms.",
    );
  }

  return data;
}

async function fetchTermGroupMembers(
  workspaceId: string,
  groupId: string,
): Promise<ListTermGroupMembersResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/members`,
  );
  const data = (await res.json()) as ListTermGroupMembersResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load members.");
  }

  return data;
}

export function TermGroupDetailPage({
  workspace,
  workspaceIndex,
  groupId,
}: TermGroupDetailPageProps) {
  const canEdit = workspace.permission !== "read";
  const queryClient = useQueryClient();
  const router = useRouter();

  const [period, setPeriod] =
    useState<TermDetailChartPeriodPreset>("last_7_days");
  const [metric, setMetric] = useState<TermDetailChartMetric>("doc_count");
  const [topTermsSort, setTopTermsSort] = useState<TermGroupTopTermsSort>("count");
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const chartFilters = useMemo<TermChartQueryFilters>(
    () => ({
      period,
      metric,
      startDate: customStartDate,
      endDate: customEndDate,
    }),
    [customEndDate, customStartDate, metric, period],
  );

  const topTermsFilters = useMemo<TermGroupTopTermsQueryFilters>(
    () => ({
      period,
      sort: topTermsSort,
      startDate: customStartDate,
      endDate: customEndDate,
    }),
    [customEndDate, customStartDate, period, topTermsSort],
  );

  const waitingForCustomRange =
    period === "custom" && (!customStartDate || !customEndDate);

  const groupQuery = useQuery({
    queryKey: termGroupQueryKey(workspace.id, groupId),
    queryFn: () => fetchTermGroup(workspace.id, groupId),
    refetchInterval: (query) => {
      const activeRun = query.state.data?.activeMemberRebuildRun;
      if (
        activeRun &&
        (activeRun.status === "pending" || activeRun.status === "running")
      ) {
        return 5000;
      }

      return false;
    },
  });

  const chartQuery = useQuery({
    queryKey: termGroupChartQueryKey(workspace.id, groupId, chartFilters),
    queryFn: () => fetchTermGroupChart(workspace.id, groupId, chartFilters),
    enabled: !waitingForCustomRange,
    refetchInterval: (query) =>
      query.state.data?.digest.isStale ? 5000 : false,
  });

  const topTermsQuery = useQuery({
    queryKey: termGroupTopTermsQueryKey(
      workspace.id,
      groupId,
      topTermsFilters,
    ),
    queryFn: () => fetchTermGroupTopTerms(workspace.id, groupId, topTermsFilters),
    enabled: !waitingForCustomRange,
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.digest.isStale) ? 5000 : false,
  });

  const membersQuery = useQuery({
    queryKey: termGroupMembersQueryKey(workspace.id, groupId),
    queryFn: () => fetchTermGroupMembers(workspace.id, groupId),
  });

  const group = groupQuery.data;

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: termGroupQueryKey(workspace.id, groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: termGroupChartQueryKey(workspace.id, groupId, chartFilters),
      }),
      queryClient.invalidateQueries({
        queryKey: termGroupTopTermsQueryKey(
          workspace.id,
          groupId,
          topTermsFilters,
        ),
      }),
      queryClient.invalidateQueries({
        queryKey: termGroupMembersQueryKey(workspace.id, groupId),
      }),
      queryClient.invalidateQueries({
        queryKey: termGroupsQueryKey(workspace.id),
      }),
    ]);
  }

  if (groupQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (groupQuery.error || !group) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <ResourceListEmpty
          title="Could not load term group"
          description={groupQuery.error?.message ?? "Term group not found."}
          actionLabel="Back to term groups"
          actionHref={getTermGroupHref(workspaceIndex)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-8">
        <div className="space-y-4">
          <Button
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            render={<Link href={getTermGroupHref(workspaceIndex)} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Term groups
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {group.name}
              </h1>
              {group.description ? (
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
            </div>

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setFormOpen(true)}
                >
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TermGroupDetailGeneral group={group} />

          {waitingForCustomRange ? (
            <ResourceListEmpty
              title="Choose a custom range"
              description="Select start and end dates to load chart metrics for that period."
            />
          ) : (
            <TermDetailChartSection
              period={period}
              metric={metric}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              chart={chartQuery.data}
              isLoading={chartQuery.isLoading}
              errorMessage={chartQuery.error?.message}
              onPeriodChange={setPeriod}
              onMetricChange={setMetric}
              onCustomRangeApply={(range) => {
                setCustomStartDate(range.startDate);
                setCustomEndDate(range.endDate);
              }}
            />
          )}
        </div>

        {!waitingForCustomRange ? (
          <TermGroupTopTermsSection
            workspaceIndex={workspaceIndex}
            sort={topTermsSort}
            data={topTermsQuery.data}
            isLoading={topTermsQuery.isLoading}
            errorMessage={topTermsQuery.error?.message}
            onSortChange={setTopTermsSort}
          />
        ) : null}

        <TermGroupMembersSection
          workspaceId={workspace.id}
          workspaceIndex={workspaceIndex}
          groupId={groupId}
          group={group}
          canEdit={canEdit}
          members={membersQuery.data}
          isLoading={membersQuery.isLoading}
          errorMessage={membersQuery.error?.message}
          onSaved={refreshAll}
        />
      </div>

      {canEdit ? (
        <>
          <TermGroupFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            workspaceId={workspace.id}
            group={{
              id: group.id,
              name: group.name,
              description: group.description,
            }}
            onSaved={refreshAll}
          />

          <TermGroupDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            workspaceId={workspace.id}
            group={{ id: group.id, name: group.name }}
            onDeleted={async () => {
              await queryClient.invalidateQueries({
                queryKey: termGroupsQueryKey(workspace.id),
              });
              router.push(getTermGroupHref(workspaceIndex));
            }}
          />
        </>
      ) : null}
    </>
  );
}
