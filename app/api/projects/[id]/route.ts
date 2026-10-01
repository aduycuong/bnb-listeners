import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateProjectSchema } from "@/lib/projects/schema";
import { deleteProject } from "@/lib/projects/services/delete-project";
import { updateProject } from "@/lib/projects/services/update-project";

const projectIdRouteParamsSchema = z.object({
  id: z.uuid(),
});

export const PATCH = createApiHandler(
  {
    parameters: projectIdRouteParamsSchema,
    requestBody: updateProjectSchema,
  },
  (params, ctx) =>
    updateProject({
      workspaceId: ctx.workspaceId,
      projectId: params.id,
      name: params.name,
      description: params.description,
      autoCreateTerms: params.autoCreateTerms,
      termLanguage: params.termLanguage,
      termCriteria: params.termCriteria,
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);

export const DELETE = createApiHandler(
  { parameters: projectIdRouteParamsSchema },
  (params, ctx) =>
    deleteProject({
      workspaceId: ctx.workspaceId,
      projectId: params.id,
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);
