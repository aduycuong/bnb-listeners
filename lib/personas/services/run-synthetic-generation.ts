import type { GenerateBody } from "../schema";
import type { StartedGeneration } from "../types";
import { registerSyntheticSource } from "./register-synthetic-source";
import { startSyntheticGeneration } from "./start-synthetic-generation";

const HOUR_MS = 60 * 60 * 1000;

/**
 * What the admin form submits: registers (or reuses) the synthetic source by
 * name and starts the runs. The window is the last `hours` up to now.
 */
export async function runSyntheticGeneration(
  params: GenerateBody,
): Promise<StartedGeneration> {
  const { sourceId } = await registerSyntheticSource({ name: params.sourceName });

  const now = Date.now();
  const { collectRunIds, threadsPerRun } = await startSyntheticGeneration({
    panelId: params.panelId,
    sourceId,
    brief: params.brief,
    posts: params.posts,
    commentsPerPost: [params.minComments, params.maxComments],
    window: {
      from: new Date(now - params.hours * HOUR_MS).toISOString(),
      to: new Date(now).toISOString(),
    },
    styleSourceId: params.styleSourceId,
    distractors: params.distractors,
  });

  return { sourceId, collectRunIds, threadsPerRun };
}
