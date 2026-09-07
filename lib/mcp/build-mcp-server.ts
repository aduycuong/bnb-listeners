import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { deleteDocument } from "@/lib/documents/services/delete-document";
import { formatZodValidationErrorText } from "@/lib/common/format-zod-validation-error";
import { toAPIError } from "@/lib/exposers/to-api-error";
import type { WorkspaceContext } from "@/lib/workspaces/types";

function toToolError(err: unknown): string {
  if (err instanceof z.ZodError) return formatZodValidationErrorText(err);
  const apiError = toAPIError(err);
  if (apiError) return apiError.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
}

export function buildMcpServer(ctx: WorkspaceContext): McpServer {
  const mcp = new McpServer({ name: "bnb-listeners", version: "1.0.0" });

  mcp.registerTool(
    "delete_document",
    {
      description: "Permanently delete a document and all its associated chunks",
      inputSchema: {
        id: z.string().uuid().describe("Document ID to delete"),
      },
    },
    async (params) => {
      try {
        const result = await deleteDocument(params, ctx);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: toToolError(err) }], isError: true };
      }
    },
  );

  return mcp;
}
