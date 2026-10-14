import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { personaBodySchema } from "@/lib/personas/schema";
import { createPersona } from "@/lib/personas/services/create-persona";
import { listPersonas } from "@/lib/personas/services/list-personas";

const options = { allowedRoles: ["admin" as const], requireWorkspace: false };

export const GET = createApiHandler({}, () => listPersonas(), options);

export const POST = createApiHandler(
  { requestBody: personaBodySchema },
  createPersona,
  options,
);
