import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { runSyntheticSource } from "@/lib/personas/services/run-synthetic-source";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

export const POST = createApiHandler({ parameters: routeParamsSchema }, runSyntheticSource, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
