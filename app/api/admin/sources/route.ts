import { listAdminSources } from "@/lib/admin-console/services/list-admin-sources";
import { createSourceBodySchema } from "@/lib/connectors/schema";
import { createSource } from "@/lib/connectors/services/create-source";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

export const GET = createApiHandler({}, () => listAdminSources(), {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});

export const POST = createApiHandler({ requestBody: createSourceBodySchema }, createSource, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
