import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { APIError } from "@/lib/exposers/api-error";
import { buildMcpServer } from "@/lib/mcp/build-mcp-server";
import { X_WORKSPACE_ID_HEADER } from "@/lib/workspaces/constants";
import { assertWorkspaceAccess } from "@/lib/workspaces/services/assert-workspace-access";

async function resolveWorkspaceContext(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    throw new APIError("Unauthorized", "Unauthorized", 401);
  }

  const workspaceId = request.headers.get(X_WORKSPACE_ID_HEADER)?.trim();
  if (!workspaceId) {
    throw new APIError(
      "ERR_WORKSPACE_ID_REQUIRED",
      "X-Workspace-Id header is required.",
      400,
    );
  }

  const permission = await assertWorkspaceAccess({
    userId: session.id,
    workspaceId,
    minPermission: "edit",
  });

  return {
    userId: session.id,
    workspaceId,
    permission,
    role: session.role,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = await resolveWorkspaceContext(request);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const mcp = buildMcpServer(ctx);
    await mcp.connect(transport);
    return transport.handleRequest(request);
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  return POST(request);
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return POST(request);
}
