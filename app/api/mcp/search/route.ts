import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest, NextResponse } from "next/server";

import { buildSearchMcpServer } from "@/lib/mcp/search/build-search-mcp-server";
import { verifyWorkspaceKey } from "@/lib/unkey/services/verify-workspace-key";

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

  const mcp = buildSearchMcpServer({ workspaceId: verification.workspaceId });
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
