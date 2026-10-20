import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { projectConfigSchema } from "@/lib/projects/schema";
import { getProjectConfig } from "@/lib/projects/services/get-project-config";
import { updateProjectConfig } from "@/lib/projects/services/update-project-config";

const projectIdRouteParamsSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler(
  { parameters: projectIdRouteParamsSchema },
  (params, ctx) =>
    getProjectConfig({
      workspaceId: ctx.workspaceId,
      projectId: params.id,
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const PUT = createApiHandler(
  {
    parameters: projectIdRouteParamsSchema,
    requestBody: projectConfigSchema,
  },
  (params, ctx) =>
    updateProjectConfig({
      workspaceId: ctx.workspaceId,
      projectId: params.id,
      case: params.case,
      caseVersion: params.caseVersion,
      caseConfig: params.caseConfig,
      entities: params.entities,
      aspects: params.aspects,
      sourceIds: params.sourceIds,
      alerts: params.alerts,
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);
