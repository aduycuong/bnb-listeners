import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getLabelSampleTask } from "@/lib/mentions/services/get-label-sample-task";

const sampleRouteParamsSchema = z.object({ id: z.uuid() });

const taskQueryParamsSchema = z.object({
  position: z.coerce.number().int().min(0).optional(),
  next: z.enum(["0", "1"]).optional(),
});

export const GET = createApiHandler(
  { parameters: sampleRouteParamsSchema, queryParams: taskQueryParamsSchema },
  (params, ctx) =>
    getLabelSampleTask({
      projectId: ctx.projectId!,
      sampleId: params.id,
      position: params.position,
      nextUnlabeled: params.next === "1",
    }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
