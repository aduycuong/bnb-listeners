import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { personaBodySchema } from "@/lib/personas/schema";
import { getPersona } from "@/lib/personas/services/get-persona";
import { updatePersona } from "@/lib/personas/services/update-persona";

const personaIdSchema = z.object({ id: z.uuid() });
const options = { allowedRoles: ["admin" as const], requireWorkspace: false };

export const GET = createApiHandler({ parameters: personaIdSchema }, getPersona, options);

export const PATCH = createApiHandler(
  { parameters: personaIdSchema, requestBody: personaBodySchema },
  updatePersona,
  options,
);
