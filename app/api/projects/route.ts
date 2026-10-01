import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createProjectSchema } from "@/lib/projects/schema";
import { createProject } from "@/lib/projects/services/create-project";
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
  { requestBody: createProjectSchema },
  (params, ctx) =>
    createProject({
      workspaceId: ctx.workspaceId,
      name: params.name,
      description: params.description,
    }),
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);
