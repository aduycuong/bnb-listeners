import { asc } from "drizzle-orm";

import { sources } from "@/db/schema";
import { getCollectSettings } from "@/lib/connectors/services/get-collect-settings";
import { db } from "@/lib/db";

import type { ListAdminSourcesResult } from "../types";
import { buildAdminSourceRows } from "../utils/build-admin-source-rows";
import { toAdminTierRules } from "../utils/to-admin-tier-rules";

/** Every source with counts, usage and scheduling; the list is small, so no paging. */
export async function listAdminSources(): Promise<ListAdminSourcesResult> {
  const [rows, settings] = await Promise.all([
    db.select().from(sources).orderBy(asc(sources.name)),
    getCollectSettings(),
  ]);
  return {
    items: await buildAdminSourceRows(rows, settings),
    tierRules: toAdminTierRules(settings),
  };
}
