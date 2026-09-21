import { runResearchTask } from "../../sources/run-research-task";
import { buildTaskKey } from "../../utils/build-task-key";
import type { ResearchGraphContext, ResearchStateType } from "../state";

/**
 * Runs every pending task (any kind) through its source runner in parallel
 * and appends the resulting findings. Tasks whose key has already completed
 * in a previous iteration are skipped.
 */
export function createGatherNode(ctx: ResearchGraphContext) {
  return async (
    state: ResearchStateType,
  ): Promise<Partial<ResearchStateType>> => {
    const seen = new Set(state.completedTaskKeys);
    const pending = state.tasks.filter((task) => {
      const key = buildTaskKey(task);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (pending.length === 0) {
      return { completedTaskKeys: [] };
    }

    const findingLists = await Promise.all(
      pending.map((task) => runResearchTask(task, ctx)),
    );

    return {
      findings: findingLists.flat(),
      completedTaskKeys: pending.map(buildTaskKey),
    };
  };
}
