import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createTermBodySchema } from "@/lib/terms/schema";
import { createTerm } from "@/lib/terms/services/create-term";
import { listTerms } from "@/lib/terms/services/list-terms";

export const GET = createApiHandler({}, (_params, ctx) => listTerms({}, ctx), {
  allowedRoles: [],
  minWorkspacePermission: "read",
});

export const POST = createApiHandler(
  { requestBody: createTermBodySchema },
  createTerm,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
