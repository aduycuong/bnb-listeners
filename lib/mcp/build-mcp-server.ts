import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { createDocument } from "@/lib/documents/services/create-document";
import { updateDocument } from "@/lib/documents/services/update-document";
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
    "create_document",
    {
      description: "Create a new document in the workspace document store",
      inputSchema: {
        docType: z
          .string()
          .min(1)
          .describe("Source category: website, news, social_post, blog, etc."),
        rawContent: z.string().min(1).describe("Full raw text content of the document"),
        sourceKey: z
          .string()
          .min(1)
          .describe(
            "Stable id for the specific source within docType (e.g. 'techcrunch.com', 'twitter:handle')",
          ),
        sourceName: z
          .string()
          .min(1)
          .describe("Human-readable source label (e.g. 'TechCrunch', '@handle')"),
        sourceId: z
          .string()
          .min(1)
          .describe("External item id from the source (platform post id, article id — not a URL)"),
        title: z.string().optional().describe("Human-readable title"),
        metadata: z.record(z.string(), z.unknown()).optional().describe("Arbitrary key-value metadata"),
        publishedAt: z.iso.datetime().optional().describe("ISO 8601 publish datetime from the source"),
      },
    },
    async (params) => {
      try {
        const doc = await createDocument(params, ctx);
        return { content: [{ type: "text", text: JSON.stringify(doc, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: toToolError(err) }], isError: true };
      }
    },
  );

  mcp.registerTool(
    "update_document",
    {
      description: "Update an existing document. Changing rawContent automatically resets embeddingStatus to pending.",
      inputSchema: {
        id: z.string().uuid().describe("Document ID to update"),
        docType: z.string().min(1).optional().describe("New source category"),
        sourceKey: z.string().min(1).optional().describe("New source instance key"),
        sourceName: z.string().min(1).optional().describe("New source display name"),
        sourceId: z.string().min(1).optional().describe("New external item id"),
        title: z.string().optional().describe("New title"),
        rawContent: z.string().min(1).optional().describe("New raw content (resets embedding)"),
        metadata: z.record(z.string(), z.unknown()).optional().describe("New metadata (replaces existing)"),
      },
    },
    async (params) => {
      try {
        const doc = await updateDocument(params, ctx);
        return { content: [{ type: "text", text: JSON.stringify(doc, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: toToolError(err) }], isError: true };
      }
    },
  );

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
