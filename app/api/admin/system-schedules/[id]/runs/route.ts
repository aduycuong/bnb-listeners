import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listSystemScheduleRuns } from "@/lib/system-schedules/services/list-system-schedule-runs";

const systemScheduleIdSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler(
  { parameters: systemScheduleIdSchema },
  (params) =>
    listSystemScheduleRuns({
      systemScheduleId: params.id,
    }),
  { allowedRoles: ["admin"], requireWorkspace: false },
);
