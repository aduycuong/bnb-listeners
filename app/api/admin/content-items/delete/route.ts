import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import {
  MAX_DELETE_CONTENT_ITEMS,
  deleteContentItems,
} from "@/lib/raw-store/services/delete-content-items";

const requestBodySchema = z.object({
  ids: z.array(z.uuid()).min(1).max(MAX_DELETE_CONTENT_ITEMS),
});

export const POST = createApiHandler({ requestBody: requestBodySchema }, deleteContentItems, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
