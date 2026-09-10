import { z } from "zod";

import { listDocumentCommentChunks } from "@/lib/comments/services/list-document-comment-chunks";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: documentIdSchema },
  listDocumentCommentChunks,
  { allowedRoles: [], minWorkspacePermission: "read" },
);
