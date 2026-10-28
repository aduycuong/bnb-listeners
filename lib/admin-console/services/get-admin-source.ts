import { and, count, eq, inArray } from "drizzle-orm";

import {
  collectRuns,
  contentItems,
  itemRefreshSchedules,
  projectSources,
  projects,
  sources,
} from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { getCollectSettings } from "@/lib/connectors/services/get-collect-settings";
import { db } from "@/lib/db";
import { readSyntheticSourceConfig } from "@/lib/personas/utils/read-synthetic-source-config";

import type { AdminSourceDetail } from "../types";
import { buildAdminSourceRows } from "../utils/build-admin-source-rows";
import { toAdminTierRules } from "../utils/to-admin-tier-rules";

type GetAdminSourceParams = {
  id: string;
};

export async function getAdminSource(params: GetAdminSourceParams): Promise<AdminSourceDetail> {
  const [source] = await db.select().from(sources).where(eq(sources.id, params.id)).limit(1);
  if (!source) {
    throw new NotFoundError("source", params.id);
  }

  const settings = await getCollectSettings();
  const [[row], [refreshes], projectRows, [active]] = await Promise.all([
    buildAdminSourceRows([source], settings),
    db
      .select({ value: count() })
      .from(itemRefreshSchedules)
      .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
      .where(eq(contentItems.sourceId, source.id)),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projectSources)
      .innerJoin(projects, eq(projects.id, projectSources.projectId))
      .where(eq(projectSources.sourceId, source.id))
      .orderBy(projects.name),
    db
      .select({ value: count() })
      .from(collectRuns)
      .where(
        and(
          eq(collectRuns.sourceId, source.id),
          inArray(collectRuns.status, ["pending", "running"]),
        ),
      ),
  ]);

  return {
    ...row!,
    tierRules: toAdminTierRules(settings),
    externalId: source.externalId,
    followerCount: source.followerCount,
    memberCount: source.memberCount,
    metadata: source.metadata,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    pendingRefreshes: refreshes?.value ?? 0,
    projects: projectRows,
    activeRuns: active?.value ?? 0,
    syntheticConfig:
      source.origin === "synthetic" ? readSyntheticSourceConfig(source.metadata) : null,
  };
}
