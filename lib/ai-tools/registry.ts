import { getAuthorsTool } from "./tools/get-authors";
import { getCaseMetricsTool } from "./tools/get-case-metrics";
import { getChannelsTool } from "./tools/get-channels";
import { getOverviewTool } from "./tools/get-overview";
import { getProjectTool } from "./tools/get-project";
import { getSentimentTool } from "./tools/get-sentiment";
import { getTopicsTool } from "./tools/get-topics";
import { listProjectsTool } from "./tools/list-projects";
import { searchMentionsTool } from "./tools/search-mentions";
import type { AiTool } from "./types";

/** Read tools of the MCP server and the chat agent (D27), in the order models see them. */
export const AI_TOOLS = [
  listProjectsTool,
  getProjectTool,
  getOverviewTool,
  getSentimentTool,
  getChannelsTool,
  getAuthorsTool,
  getTopicsTool,
  getCaseMetricsTool,
  searchMentionsTool,
] as AiTool[];
