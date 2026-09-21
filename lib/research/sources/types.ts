import type { ResearchGraphContext } from "../graph/state";
import type { Finding, ResearchTask, ResearchTaskKind } from "../types";

/** Task type narrowed to one kind. */
export type ResearchTaskOf<K extends ResearchTaskKind> = Extract<
  ResearchTask,
  { kind: K }
>;

/**
 * Contract every evidence source implements: take one typed task, return
 * zero or more findings. Runners must never throw for "no results"; they may
 * throw for hard failures unless the source is best-effort by design.
 */
export type ResearchSourceRunner<K extends ResearchTaskKind> = {
  kind: K;
  run: (task: ResearchTaskOf<K>, ctx: ResearchGraphContext) => Promise<Finding[]>;
};
