import { inArray } from "drizzle-orm";

import { sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

/** Sources must exist. Connector and synthetic sources are both selectable. */
export async function assertSourcesSelectable(params: { sourceIds: string[] }): Promise<void> {
  const ids = [...new Set(params.sourceIds)];
  if (ids.length === 0) return;

  const rows = await db
    .select({ id: sources.id })
    .from(sources)
    .where(inArray(sources.id, ids));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = ids.find((id) => !byId.has(id));
  if (missing) throw new NotFoundError("source", missing);
}
