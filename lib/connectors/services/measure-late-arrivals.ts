import { and, count, eq, lt, min } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

type MeasureLateArrivalsParams = {
  collectRunId: string;
  /** Newest stored `published_at` of the source before the run (ISO). */
  newestKnownAt?: string;
};

type MeasureLateArrivalsResult = {
  /** Posts new to the store yet published before `newestKnownAt`. */
  lateArrivals: number;
  /** How far before `newestKnownAt` the oldest late arrival was published. */
  maxLatenessMinutes: number;
};

/**
 * Late arrivals are posts an earlier run could not see yet (e.g. approved
 * late in a group). Only those inside the overlap window can be caught, so a
 * `maxLatenessMinutes` close to the overlap means the overlap is too short.
 */
export async function measureLateArrivals(
  params: MeasureLateArrivalsParams,
): Promise<MeasureLateArrivalsResult> {
  if (!params.newestKnownAt) return { lateArrivals: 0, maxLatenessMinutes: 0 };

  const newestKnownAt = new Date(params.newestKnownAt);
  const [row] = await db
    .select({ lateArrivals: count(), oldest: min(contentItems.publishedAt) })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.collectRunId, params.collectRunId),
        eq(contentItems.kind, "post"),
        lt(contentItems.publishedAt, newestKnownAt),
      ),
    );

  return {
    lateArrivals: row?.lateArrivals ?? 0,
    maxLatenessMinutes: row?.oldest
      ? Math.round((newestKnownAt.getTime() - row.oldest.getTime()) / 60_000)
      : 0,
  };
}
