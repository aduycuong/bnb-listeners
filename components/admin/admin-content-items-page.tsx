"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AdminContentItemRow,
  AdminSourceRow,
  PageResult,
} from "@/lib/admin-console/types";

import { AdminContentItemsTable } from "./admin-content-items-table";
import { AdminDeleteContentItemsDialog } from "./admin-delete-content-items-dialog";
import { AdminFilterSelect } from "./admin-filter-select";
import { AdminPager } from "./admin-pager";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";
import { useAdminSearchParams } from "./use-admin-search-params";

const KINDS = ["post", "comment", "reply"] as const;
const ORIGINS = ["connector", "legacy_import", "synthetic"] as const;
const FILTER_KEYS = ["sourceId", "kind", "origin", "collectRunId", "q"] as const;

export function AdminContentItemsPage() {
  const { values, page, setValue } = useAdminSearchParams(FILTER_KEYS);
  const [q, setQ] = useState(values.q);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const filterKey = FILTER_KEYS.map((key) => values[key]).join("|");
  const [selectionFilter, setSelectionFilter] = useState(filterKey);

  if (selectionFilter !== filterKey) {
    setSelectionFilter(filterKey);
    setSelectedIds(new Set());
    setConfirming(false);
  }

  // Search is applied after typing stops.
  useEffect(() => {
    if (q === values.q) return;
    const timer = setTimeout(() => setValue("q", q.trim()), 400);
    return () => clearTimeout(timer);
  }, [q, values.q, setValue]);

  const sources = useQuery({
    queryKey: adminQueryKeys.sources(),
    queryFn: () => fetchAdminJson<{ items: AdminSourceRow[] }>("/api/admin/sources"),
  });

  const filters = { ...values, page };
  const { data, isPending, error, isFetching } = useQuery({
    queryKey: adminQueryKeys.contentItems(filters),
    queryFn: () =>
      fetchAdminJson<PageResult<AdminContentItemRow>>("/api/admin/content-items", filters),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <AdminSection
        title="Content items"
        description={
          values.collectRunId
            ? `Items last written by collect run ${values.collectRunId}.`
            : "Posts, comments and replies in the raw store, newest first."
        }
        actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setConfirming(true)}
          >
            Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
          </Button>
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search text…"
            className="h-8 w-56"
          />
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
            label="kinds"
            value={values.kind}
            options={KINDS}
            onChange={(value) => setValue("kind", value)}
          />
          <AdminFilterSelect
            label="origins"
            value={values.origin}
            options={ORIGINS}
            onChange={(value) => setValue("origin", value)}
          />
        </div>
      }
    >
      {data ? (
        <div className={isFetching ? "space-y-3 opacity-60" : "space-y-3"}>
          <AdminContentItemsTable
            rows={data.items}
            selection={{
              selectedIds,
              onToggle: (id, selected) => {
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (selected) next.add(id);
                  else next.delete(id);
                  return next;
                });
              },
              onTogglePage: (selected) => {
                setSelectedIds((current) => {
                  const next = new Set(current);
                  for (const item of data.items) {
                    if (selected) next.add(item.id);
                    else next.delete(item.id);
                  }
                  return next;
                });
              },
            }}
          />
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
      <AdminDeleteContentItemsDialog
        open={confirming}
        onOpenChange={setConfirming}
        ids={[...selectedIds]}
        onDeleted={() => setSelectedIds(new Set())}
      />
    </>
  );
}
