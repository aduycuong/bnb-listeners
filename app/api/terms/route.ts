import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createTermBodySchema } from "@/lib/terms/schema";
import { createTerm } from "@/lib/terms/services/create-term";
import { listTerms } from "@/lib/terms/services/list-terms";

const listTermsQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const GET = createApiHandler(
  { queryParams: listTermsQuerySchema },
  (params, ctx) => listTerms(params, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createTermBodySchema },
  createTerm,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
