import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { resetSetting } from "@/lib/settings/services/reset-setting";
import { updateSetting } from "@/lib/settings/services/update-setting";

const routeParamsSchema = z.object({
  key: z.string().min(1),
});

/** The group's own schema validates `value` in the service. */
const requestBodySchema = z.object({
  value: z.record(z.string(), z.unknown()),
});

export const PUT = createApiHandler(
  { parameters: routeParamsSchema, requestBody: requestBodySchema },
  (params, ctx) => updateSetting({ key: params.key, value: params.value, userId: ctx.userId }),
  { allowedRoles: ["admin"], requireWorkspace: false },
);

/** Back to the defaults in code. */
export const DELETE = createApiHandler({ parameters: routeParamsSchema }, resetSetting, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
