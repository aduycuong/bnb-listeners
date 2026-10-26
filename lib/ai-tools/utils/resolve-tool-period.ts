import type { ReportPeriod } from "@/lib/metrics/types";

import { AI_TOOLS_CONFIG } from "../config";

export function resolveToolPeriod(period: ReportPeriod | undefined): ReportPeriod {
  return period ?? AI_TOOLS_CONFIG.defaultPeriod;
}
