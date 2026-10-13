import { count, eq } from "drizzle-orm";

import { contentItems, itemRefreshSchedules, sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { AdminSourceDetail } from "../types";
import { buildAdminSourceRows } from "../utils/build-admin-source-rows";

type GetAdminSourceParams = {
  id: string;
};

export async function getAdminSource(params: GetAdminSourceParams): Promise<AdminSourceDetail> {
  const [source] = await db.select().from(sources).where(eq(sources.id, params.id)).limit(1);
  if (!source) {
    throw new NotFoundError("source", params.id);
  }

  const [[row], [refreshes]] = await Promise.all([
    buildAdminSourceRows([source]),
    db
      .select({ value: count() })
      .from(itemRefreshSchedules)
      .innerJoin(contentItems, eq(contentItems.id, itemRefreshSchedules.contentItemId))
      .where(eq(contentItems.sourceId, source.id)),
  ]);

  return {
    ...row!,
    externalId: source.externalId,
    followerCount: source.followerCount,
    memberCount: source.memberCount,
    metadata: source.metadata,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    pendingRefreshes: refreshes?.value ?? 0,
  };
}
