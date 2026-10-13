"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  AdminCollectRunRow,
  AdminSourceRow,
  PageResult,
} from "@/lib/admin-console/types";
import { COLLECT_RUN_STATUSES, CONNECTOR_KEYS } from "@/lib/connectors/constants";

import { AdminCollectRunsTable } from "./admin-collect-runs-table";
import { AdminFilterSelect } from "./admin-filter-select";
import { AdminPager } from "./admin-pager";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";
import { useAdminSearchParams } from "./use-admin-search-params";

const FILTER_KEYS = ["sourceId", "connector", "status"] as const;

export function AdminCollectRunsPage() {
  const { values, page, setValue } = useAdminSearchParams(FILTER_KEYS);

  const sources = useQuery({
    queryKey: adminQueryKeys.sources(),
    queryFn: () => fetchAdminJson<{ items: AdminSourceRow[] }>("/api/admin/sources"),
  });

  const filters = { ...values, page };
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: adminQueryKeys.collectRuns(filters),
    queryFn: () =>
      fetchAdminJson<PageResult<AdminCollectRunRow>>("/api/admin/collect-runs", filters),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  return (
    <AdminSection
      title="Collect runs"
      description="One row per connector run; records = Bright Data rows delivered."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AdminFilterSelect
            label="sources"
            value={values.sourceId}
            options={(sources.data?.items ?? []).map((source) => ({
              value: source.id,
              label: source.name ?? source.id,
            }))}
            onChange={(value) => setValue("sourceId", value)}
          />
          <AdminFilterSelect
            label="connectors"
            value={values.connector}
            options={CONNECTOR_KEYS}
            onChange={(value) => setValue("connector", value)}
          />
          <AdminFilterSelect
            label="statuses"
            value={values.status}
            options={COLLECT_RUN_STATUSES}
            onChange={(value) => setValue("status", value)}
          />
        </div>
      }
    >
      {data ? (
        <div className={isFetching ? "space-y-3 opacity-60" : "space-y-3"}>
          <AdminCollectRunsTable rows={data.items} />
          <AdminPager
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(next) => setValue("page", String(next))}
          />
        </div>
      ) : (
        <AdminQueryState isPending={isPending} error={error} />
      )}
    </AdminSection>
  );
}
