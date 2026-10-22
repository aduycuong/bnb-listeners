import type { AfterNormalizeResult, ConnectorContext } from "../types";
import { createItemRefreshSchedules } from "./create-item-refresh-schedules";
import { measureLateArrivals } from "./measure-late-arrivals";
import { recomputeSourceActivityTier } from "./recompute-source-activity-tier";

type AfterPostScanParams = {
  /** Newest stored post before the run (ISO), to count late arrivals. */
  newestKnownAt?: string;
};

/**
 * After-normalize hook of a channel or group scan: late arrivals, comment
 * refresh schedules for the new posts, and the source's activity tier.
 */
export async function afterPostScan(
  context: ConnectorContext,
  params: AfterPostScanParams,
): Promise<AfterNormalizeResult> {
  const [lateArrivals, schedules] = await Promise.all([
    measureLateArrivals({
      collectRunId: context.collectRunId,
      newestKnownAt: params.newestKnownAt,
    }),
    createItemRefreshSchedules({ collectRunId: context.collectRunId }),
  ]);
  const tier = context.sourceId
    ? await recomputeSourceActivityTier({ sourceId: context.sourceId })
    : null;

  const { followUps, ...scheduleStats } = schedules;
  return { stats: { ...lateArrivals, ...scheduleStats, ...tier }, followUps };
}
