import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextResponse, type NextRequest } from "next/server";

import { createMcpServer } from "@/lib/ai-tools/services/create-mcp-server";
import { APIError } from "@/lib/exposers/api-error";
import { authorizeWorkspaceKey } from "@/lib/unkey/services/authorize-workspace-key";

/**
 * MCP server of the report tools (docs/decisions.md D27): Streamable HTTP, stateless, one
 * server per request. `Authorization: Bearer <workspace API key>`; the key's scopes and
 * projects decide which tools and projects the caller sees.
 */
async function handleRequest(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authorization: Bearer <key> header is required." },
      { status: 401 },
    );
  }

  let key;
  try {
    key = await authorizeWorkspaceKey(apiKey);
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const mcp = createMcpServer({
    workspaceId: key.workspaceId,
    userId: key.userId,
    userEmail: key.userEmail,
    scopes: key.scopes,
    projectIds: key.projectIds,
  });
  await mcp.connect(transport);
  return transport.handleRequest(request);
}

export const POST = handleRequest;
export const GET = handleRequest;
export const DELETE = handleRequest;
