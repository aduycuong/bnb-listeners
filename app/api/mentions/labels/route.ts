import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { setItemLabelBodySchema } from "@/lib/mentions/schema";
import { setItemLabel } from "@/lib/mentions/services/set-item-label";

export const PUT = createApiHandler(
  { requestBody: setItemLabelBodySchema },
  (params, ctx) =>
    setItemLabel({
      projectId: ctx.projectId!,
      userId: ctx.userId,
      contentItemId: params.contentItemId,
      isRelevant: params.isRelevant,
      sentiment: params.sentiment,
      aspectKeys: params.aspectKeys,
      sampleId: params.sampleId,
    }),
  { allowedRoles: [], minWorkspacePermission: "edit", requireProject: true },
);
