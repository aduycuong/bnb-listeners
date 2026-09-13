import type { WorkspaceContext } from "@/lib/workspaces/types";

export type SearchMcpContext = {
  workspaceId: string;
};

export function toWorkspaceContext(ctx: SearchMcpContext): WorkspaceContext {
  return {
    userId: "mcp",
    workspaceId: ctx.workspaceId,
    permission: "owner",
  };
}
