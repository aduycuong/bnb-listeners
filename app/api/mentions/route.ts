import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listMentionsQuerySchema } from "@/lib/mentions/schema";
import { listMentions } from "@/lib/mentions/services/list-mentions";

export const GET = createApiHandler(
  { queryParams: listMentionsQuerySchema },
  (params, ctx) => listMentions({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
