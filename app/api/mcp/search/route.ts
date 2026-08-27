import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { RETRIEVAL_RETURN_LIMIT } from "@/lib/retrieval/config";
import { searchChunks } from "@/lib/retrieval/services/search-chunks";
import {
  formatRetrievalContext,
  formatSources,
} from "@/lib/retrieval/utils/format-retrieval-context";
import { verifyWorkspaceKey } from "@/lib/unkey/services/verify-workspace-key";

function buildSearchMcpServer(workspaceId: string): McpServer {
  const mcp = new McpServer({ name: "bnb-search", version: "1.0.0" });

  mcp.registerTool(
    "search_knowledge",
    {
      description:
        "Search the workspace knowledge base for relevant information using hybrid semantic and full-text search. Use this to answer questions about topics, documents, and content stored in the workspace.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Natural language search query"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(RETRIEVAL_RETURN_LIMIT * 2)
          .optional()
          .describe(`Number of results to return (default ${RETRIEVAL_RETURN_LIMIT})`),
        topicIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Filter results to specific topic IDs"),
      },
    },
    async ({ query, limit, topicIds }) => {
      const chunks = await searchChunks({
        workspaceId,
        query,
        limit: limit ?? RETRIEVAL_RETURN_LIMIT,
        topicIds,
      });

      if (chunks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant information found for this query.",
            },
          ],
        };
      }

      const context = formatRetrievalContext(chunks);
      const sources = formatSources(chunks);

      const sourcesText = sources
        .map(
          (s) =>
            `[${s.index}] ${s.title} (${s.docType})${s.publishedAt ? ` · ${new Date(s.publishedAt).toLocaleDateString()}` : ""}`,
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${chunks.length} relevant result(s):\n\n${context}\n\n---\nSources:\n${sourcesText}`,
          },
        ],
      };
    },
  );

  return mcp;
}

async function handleRequest(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authorization: Bearer <key> header is required." },
      { status: 401 },
    );
  }

  const verification = await verifyWorkspaceKey(apiKey);

  if (!verification.valid) {
    return NextResponse.json(
      { error: "Unauthorized", message: verification.reason },
      { status: 401 },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const mcp = buildSearchMcpServer(verification.workspaceId);
  await mcp.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleRequest(request);
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return handleRequest(request);
}
