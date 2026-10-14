import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { panelBodySchema } from "@/lib/personas/schema";
import { getPersonaPanel } from "@/lib/personas/services/get-persona-panel";
import { updatePersonaPanel } from "@/lib/personas/services/update-persona-panel";

const panelIdSchema = z.object({ id: z.uuid() });
const options = { allowedRoles: ["admin" as const], requireWorkspace: false };

export const GET = createApiHandler({ parameters: panelIdSchema }, getPersonaPanel, options);

export const PATCH = createApiHandler(
  { parameters: panelIdSchema, requestBody: panelBodySchema },
  updatePersonaPanel,
  options,
);
