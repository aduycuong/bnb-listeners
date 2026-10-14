import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createProjectWithConfigSchema } from "@/lib/projects/schema";
import { createProjectWithConfig } from "@/lib/projects/services/create-project-with-config";
import { listProjects } from "@/lib/projects/services/list-projects";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listProjects({ workspaceId: ctx.workspaceId }),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createProjectWithConfigSchema },
  (params, ctx) =>
    createProjectWithConfig({
      workspaceId: ctx.workspaceId,
      name: params.name,
      description: params.description,
      case: params.case,
      mode: params.mode,
      caseConfig: params.caseConfig,
      entities: params.entities,
      aspects: params.aspects,
      sourceIds: params.sourceIds,
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);
