import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getMentionThread } from "@/lib/mentions/services/get-mention-thread";

const threadQueryParamsSchema = z.object({ rootId: z.uuid() });

export const GET = createApiHandler(
  { queryParams: threadQueryParamsSchema },
  (params, ctx) => getMentionThread({ projectId: ctx.projectId!, rootId: params.rootId }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
