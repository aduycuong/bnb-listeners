import { z } from "zod";

import { listDocumentComments } from "@/lib/comments/services/list-document-comments";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: documentIdSchema },
  listDocumentComments,
  { allowedRoles: [], minWorkspacePermission: "read" },
);
