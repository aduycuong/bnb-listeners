import type { AlertRuleKind } from "@/lib/projects/alert-templates";

import type { AlertLevel } from "./types";

export const EVALUATE_ALERTS_JOB_NAME = "evaluate-alerts";

export const ALERT_LIST_LIMIT = 50;

/** Viral posts older than this are left alone so the first run does not mail the whole history. */
export const VIRAL_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export const VIRAL_POST_LIMIT = 10;

export function alertLevelForKind(kind: AlertRuleKind): AlertLevel {
  if (kind === "volume_growth" || kind === "buyer_questions_growth") return "med";
  return "high";
}
