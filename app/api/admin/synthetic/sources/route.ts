import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createSyntheticSourceBodySchema } from "@/lib/personas/schema";
import { createSyntheticSource } from "@/lib/personas/services/create-synthetic-source";

export const POST = createApiHandler(
  { requestBody: createSyntheticSourceBodySchema },
  createSyntheticSource,
  { allowedRoles: ["admin"], requireWorkspace: false },
);
