import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextResponse, type NextRequest } from "next/server";

import { createMcpServer } from "@/lib/ai-tools/services/create-mcp-server";
import { verifyWorkspaceKey } from "@/lib/unkey/services/verify-workspace-key";

/**
 * MCP server of the report tools (docs/decisions.md D27): Streamable HTTP, stateless, one
 * server per request. `Authorization: Bearer <workspace API key>`.
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

  const verification = await verifyWorkspaceKey(apiKey);
  if (!verification.valid) {
    return NextResponse.json({ error: "Unauthorized", message: verification.reason }, { status: 401 });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const mcp = createMcpServer({ workspaceId: verification.workspaceId, projectIds: null });
  await mcp.connect(transport);
  return transport.handleRequest(request);
}

export const POST = handleRequest;
export const GET = handleRequest;
export const DELETE = handleRequest;
