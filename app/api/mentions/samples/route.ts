import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createLabelSampleBodySchema } from "@/lib/mentions/schema";
import { createLabelSample } from "@/lib/mentions/services/create-label-sample";
import { listLabelSampleSummaries } from "@/lib/mentions/services/get-label-sample-summary";

export const GET = createApiHandler(
  {},
  async (_params, ctx) => ({
    items: await listLabelSampleSummaries({ projectId: ctx.projectId! }),
  }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);

export const POST = createApiHandler(
  { requestBody: createLabelSampleBodySchema },
  (params, ctx) =>
    createLabelSample({
      projectId: ctx.projectId!,
      userId: ctx.userId,
      mentions: params.mentions,
      unmatched: params.unmatched,
    }),
  { allowedRoles: [], minWorkspacePermission: "edit", requireProject: true },
);
