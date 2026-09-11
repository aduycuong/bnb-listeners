import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { bulkDeleteTerms } from "@/lib/terms/services/bulk-delete-terms";
import { TERM_BULK_DELETE_MAX } from "@/lib/terms/term-config";

const bulkDeleteTermsBodySchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1, { error: "At least one term id is required." })
    .max(TERM_BULK_DELETE_MAX, {
      error: `Cannot delete more than ${TERM_BULK_DELETE_MAX} terms at once.`,
    }),
});

export const POST = createApiHandler(
  { requestBody: bulkDeleteTermsBodySchema },
  bulkDeleteTerms,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
