import { chunk } from "@/lib/connectors/utils/chunk";
import { createCollectRun } from "@/lib/connectors/services/create-collect-run";
import { NotFoundError } from "@/lib/common/service-errors";

import { SYNTHETIC_CONFIG } from "../config";
import type { SyntheticThreadsParams } from "../schema";
import { loadPanelMembers } from "./load-panel-members";

type StartSyntheticGenerationParams = {
  panelId: string;
  sourceId: string;
  /** Total threads; split into runs of at most `maxThreadsPerRun`. */
  posts: number;
} & Pick<SyntheticThreadsParams, "brief"> &
  Partial<
    Pick<
      SyntheticThreadsParams,
      | "commentsPerPost"
      | "window"
      | "seed"
      | "model"
      | "styleSourceId"
      | "distractors"
    >
  >;

export type StartSyntheticGenerationResult = {
  collectRunIds: string[];
  threadsPerRun: number[];
};

/**
 * Starts the `synthetic-threads` runs for a panel and source. A large request
 * becomes several runs so each one fits in a workflow step; run `i` uses
 * `seed + i` so the plans differ but stay reproducible.
 */
export async function startSyntheticGeneration(
  params: StartSyntheticGenerationParams,
): Promise<StartSyntheticGenerationResult> {
  const members = await loadPanelMembers(params.panelId);
  if (members.length === 0) {
    throw new NotFoundError("persona panel members", params.panelId);
  }

  const seed = params.seed ?? Math.floor(Math.random() * 2 ** 31);
  const slots = Array.from({ length: params.posts }, (_, index) => index);
  const batches = chunk(slots, SYNTHETIC_CONFIG.maxThreadsPerRun);

  const collectRunIds: string[] = [];
  for (const [runIndex, batch] of batches.entries()) {
    const run = await createCollectRun({
      connector: "synthetic-threads",
      sourceId: params.sourceId,
      params: {
        panelId: params.panelId,
        brief: params.brief,
        postCount: batch.length,
        seed: seed + runIndex,
        ...(params.commentsPerPost && { commentsPerPost: params.commentsPerPost }),
        ...(params.window && { window: params.window }),
        ...(params.model && { model: params.model }),
        ...(params.styleSourceId && { styleSourceId: params.styleSourceId }),
        ...(params.distractors && { distractors: params.distractors }),
      },
    });
    collectRunIds.push(run.collectRunId);
  }

  return { collectRunIds, threadsPerRun: batches.map((batch) => batch.length) };
}
