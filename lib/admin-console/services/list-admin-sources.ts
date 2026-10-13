import { asc } from "drizzle-orm";

import { sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { AdminSourceRow } from "../types";
import { buildAdminSourceRows } from "../utils/build-admin-source-rows";

/** Every source with counts, usage and scheduling; the list is small, so no paging. */
export async function listAdminSources(): Promise<{ items: AdminSourceRow[] }> {
  const rows = await db.select().from(sources).orderBy(asc(sources.name));
  return { items: await buildAdminSourceRows(rows) };
}
