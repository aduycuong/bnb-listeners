import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { RETRIEVAL_RETURN_LIMIT } from "@/lib/retrieval/config";
import { getDocumentComments } from "@/lib/retrieval/services/get-document-comments";
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
          .array(z.uuid())
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
            `[${s.index}] ${s.title} (${s.docType})${s.publishedAt ? ` · ${new Date(s.publishedAt).toLocaleDateString()}` : ""}${s.docType !== DISCUSSION_DOC_TYPE && s.commentCount > 0 ? ` · ${s.commentCount} comments` : ""} · doc:${s.documentId}`,
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

  mcp.registerTool(
    "get_document_comments",
    {
      description:
        "Retrieve the community discussion (comments and replies) for a specific document. " +
        "Call this tool when search results show a document has comments (e.g. '12 comments') " +
        "and you need to know what users said, asked, debated, or answered about that document. " +
        "Use the document ID shown after 'doc:' in the search results. " +
        "Returns the full discussion text with each comment's author, date, role (answer/debate/info), " +
        "and stance (agree/disagree/neutral for debates).",
      inputSchema: {
        documentId: z
          .uuid()
          .describe("The document ID shown after 'doc:' in search results"),
      },
    },
    async ({ documentId }) => {
      const result = await getDocumentComments(documentId)
      if (!result.found) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No discussion found for this document. There are no substantive comments yet.",
            },
          ],
        };
      }

      const header = [
        result.title ?? "Discussion",
        `${result.commentCount} comments`,
        result.publishedAt
          ? new Date(result.publishedAt).toLocaleDateString("en-US", { dateStyle: "medium" })
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        content: [
          {
            type: "text" as const,
            text: `${header}\n\n${result.content}`,
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
