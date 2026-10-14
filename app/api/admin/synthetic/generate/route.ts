import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { generateBodySchema } from "@/lib/personas/schema";
import { runSyntheticGeneration } from "@/lib/personas/services/run-synthetic-generation";

export const POST = createApiHandler(
  { requestBody: generateBodySchema },
  runSyntheticGeneration,
  { allowedRoles: ["admin"], requireWorkspace: false },
);
