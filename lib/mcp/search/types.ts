import type { WorkspaceContext } from "@/lib/workspaces/types";

export type SearchMcpContext = {
  workspaceId: string;
};

export function toWorkspaceContext(
  ctx: SearchMcpContext,
  projectId: string | null = null,
): WorkspaceContext {
  return {
    userId: "mcp",
    workspaceId: ctx.workspaceId,
    projectId,
    permission: "owner",
  };
}
