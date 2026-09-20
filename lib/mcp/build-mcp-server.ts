import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function buildMcpServer(): McpServer {
  const mcp = new McpServer({ name: "bnb-listeners", version: "1.0.0" });
  return mcp;
}
