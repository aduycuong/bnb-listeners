import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateSyntheticSourceBodySchema } from "@/lib/personas/schema";
import { updateSyntheticSource } from "@/lib/personas/services/update-synthetic-source";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

export const PATCH = createApiHandler(
  { parameters: routeParamsSchema, requestBody: updateSyntheticSourceBodySchema },
  updateSyntheticSource,
  { allowedRoles: ["admin"], requireWorkspace: false },
);
