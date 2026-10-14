import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listSelectableSources } from "@/lib/projects/services/list-selectable-sources";

export const GET = createApiHandler({}, () => listSelectableSources(), {
  allowedRoles: [],
  minWorkspacePermission: "read",
});
