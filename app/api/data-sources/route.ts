import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { sourceTypeSchema } from "@/lib/data-sources/schema";
import { createDataSourceBodySchema } from "@/lib/data-sources/schema";
import { createDataSource } from "@/lib/data-sources/services/create-data-source";
import { listDataSources } from "@/lib/data-sources/services/list-data-sources";

const listDataSourcesQuerySchema = z.object({
  sourceType: sourceTypeSchema.optional(),
});

export const GET = createApiHandler(
  { queryParams: listDataSourcesQuerySchema },
  (params, ctx) => listDataSources({ sourceType: params.sourceType }, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createDataSourceBodySchema },
  createDataSource,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
