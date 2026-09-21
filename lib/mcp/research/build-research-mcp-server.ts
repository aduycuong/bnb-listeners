import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerGetResearchStatusTool } from "./tools/get-research-status";
import { registerStartResearchTool } from "./tools/start-research";
import type { ResearchMcpContext } from "./types";

export function buildResearchMcpServer(ctx: ResearchMcpContext): McpServer {
  const mcp = new McpServer({ name: "bnb-research", version: "1.0.0" });

  registerStartResearchTool(mcp, ctx);
  registerGetResearchStatusTool(mcp, ctx);

  return mcp;
}
