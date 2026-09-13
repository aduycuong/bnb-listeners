import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerFindTopTermsTool } from "./tools/find-top-terms";
import { registerGetDocumentCommentsTool } from "./tools/get-document-comments";
import { registerGetTermDetailTool } from "./tools/get-term-detail";
import { registerSearchKnowledgeTool } from "./tools/search-knowledge";
import type { SearchMcpContext } from "./types";

export function buildSearchMcpServer(ctx: SearchMcpContext): McpServer {
  const mcp = new McpServer({ name: "bnb-search", version: "1.0.0" });

  registerSearchKnowledgeTool(mcp, ctx);
  registerGetDocumentCommentsTool(mcp, ctx);
  registerFindTopTermsTool(mcp, ctx);
  registerGetTermDetailTool(mcp, ctx);

  return mcp;
}
