"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import type { CollectRunPayload } from "@/lib/admin-console/types";

import { formatNumber } from "./admin-format";
import { AdminJsonBlock } from "./admin-json-block";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { fetchAdminJson } from "./fetch-admin-json";

const PAGE_SIZE = 20;

/** Raw provider payload (L0) of a run, read from storage on demand, 20 records at a time. */
export function AdminCollectRunPayload({ collectRunId }: { collectRunId: string }) {
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: adminQueryKeys.collectRunPayload(collectRunId, offset),
    queryFn: () =>
      fetchAdminJson<CollectRunPayload>(`/api/admin/collect-runs/${collectRunId}/payload`, {
        offset,
        limit: PAGE_SIZE,
      }),
    enabled: open,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Load raw payload
      </Button>
    );
  }

  if (!data) return <AdminQueryState isPending={isPending} error={error} />;

  const end = Math.min(data.total, offset + data.records.length);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {data.payloadKey} · {formatNumber(Math.round(data.sizeBytes / 1024))} KB · records{" "}
          {formatNumber(data.total === 0 ? 0 : offset + 1)}–{formatNumber(end)} /{" "}
          {formatNumber(data.total)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || isFetching}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={end >= data.total || isFetching}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
      <AdminJsonBlock value={data.records} className="max-h-[70vh]" />
    </div>
  );
}
