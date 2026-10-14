import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { panelBodySchema } from "@/lib/personas/schema";
import { createPersonaPanel } from "@/lib/personas/services/create-persona-panel";
import { listPersonaPanels } from "@/lib/personas/services/list-persona-panels";

const options = { allowedRoles: ["admin" as const], requireWorkspace: false };

export const GET = createApiHandler({}, () => listPersonaPanels(), options);

export const POST = createApiHandler(
  { requestBody: panelBodySchema },
  createPersonaPanel,
  options,
);
