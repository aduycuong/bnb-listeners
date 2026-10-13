import { collectRuns, sources } from "@/db/schema";
import type { CollectRunStatus, ConnectorKey } from "@/lib/connectors/constants";

import type { AdminCollectRunRow } from "../types";
import { toIso } from "./to-iso";

/** Columns for an `AdminCollectRunRow`; join `sources` (left). */
export const collectRunRowColumns = {
  id: collectRuns.id,
  connector: collectRuns.connector,
  sourceId: sources.id,
  sourceName: sources.name,
  status: collectRuns.status,
  itemCount: collectRuns.itemCount,
  stats: collectRuns.stats,
  error: collectRuns.error,
  payloadKey: collectRuns.payloadKey,
  createdAt: collectRuns.createdAt,
  startedAt: collectRuns.startedAt,
  finishedAt: collectRuns.finishedAt,
};

type CollectRunRowRecord = {
  id: string;
  connector: string;
  sourceId: string | null;
  sourceName: string | null;
  status: string;
  itemCount: number | null;
  stats: Record<string, unknown> | null;
  error: string | null;
  payloadKey: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export function toCollectRunRow(row: CollectRunRowRecord): AdminCollectRunRow {
  return {
    id: row.id,
    connector: row.connector as ConnectorKey,
    source: row.sourceId ? { id: row.sourceId, name: row.sourceName } : null,
    status: row.status as CollectRunStatus,
    itemCount: row.itemCount,
    stats: row.stats,
    error: row.error,
    hasPayload: Boolean(row.payloadKey),
    createdAt: row.createdAt.toISOString(),
    startedAt: toIso(row.startedAt),
    finishedAt: toIso(row.finishedAt),
  };
}
