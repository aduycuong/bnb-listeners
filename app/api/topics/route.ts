import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listTopicsQuerySchema } from "@/lib/topics/schema";
import { listTopics } from "@/lib/topics/services/list-topics";

export const GET = createApiHandler(
  { queryParams: listTopicsQuerySchema },
  (params, ctx) => listTopics({ ...params, projectId: ctx.projectId! }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
