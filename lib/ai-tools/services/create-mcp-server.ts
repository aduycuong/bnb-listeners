import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ServiceError } from "@/lib/common/service-errors";

import { AI_TOOLS_CONFIG } from "../config";
import { AI_TOOLS } from "../registry";
import type { AiToolContext } from "../types";

/**
 * An MCP server with the AI tools the caller's key may use (D27). Results go back as JSON text;
 * service errors (not found, invalid input) are tool errors the model can read and fix.
 */
export function createMcpServer(ctx: AiToolContext): McpServer {
  const mcp = new McpServer({
    name: AI_TOOLS_CONFIG.serverName,
    version: AI_TOOLS_CONFIG.serverVersion,
  });

  const tools = AI_TOOLS.filter((tool) => !tool.scope || ctx.scopes.includes(tool.scope));
  for (const tool of tools) {
    mcp.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: !tool.writes },
      },
      async (input: unknown) => {
        try {
          const result = await tool.run(tool.inputSchema.parse(input), ctx);
          return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
        } catch (error) {
          if (!(error instanceof ServiceError)) console.error(error);
          const message = error instanceof ServiceError ? error.message : "Lỗi máy chủ.";
          return { content: [{ type: "text" as const, text: message }], isError: true };
        }
      },
    );
  }

  return mcp;
}
