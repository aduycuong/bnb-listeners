import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { mergeTermsBodySchema } from "@/lib/terms/schema";
import { mergeTerms } from "@/lib/terms/services/merge-terms";

export const POST = createApiHandler(
  { requestBody: mergeTermsBodySchema },
  mergeTerms,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
