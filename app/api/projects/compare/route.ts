import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createCompareProjectSchema } from "@/lib/projects/schema";
import { createCompareProject } from "@/lib/projects/services/create-compare-project";

export const POST = createApiHandler(
  { requestBody: createCompareProjectSchema },
  (params, ctx) =>
    createCompareProject({
      workspaceId: ctx.workspaceId,
      name: params.name,
      description: params.description,
      case: params.case,
      primaryId: params.primaryId,
      competitorIds: params.competitorIds,
    }),
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
