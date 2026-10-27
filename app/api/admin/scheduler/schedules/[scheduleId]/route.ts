import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { setScheduleEnabled } from "@/lib/schedules/services/set-schedule-enabled";

const routeParamsSchema = z.object({
  scheduleId: z.string().min(1),
});

const requestBodySchema = z.object({
  enabled: z.boolean(),
});

/** Enable (create or sync from code, then resume) or disable (pause) a QStash schedule. */
export const PUT = createApiHandler(
  { parameters: routeParamsSchema, requestBody: requestBodySchema },
  setScheduleEnabled,
  { allowedRoles: ["admin"], requireWorkspace: false },
);
