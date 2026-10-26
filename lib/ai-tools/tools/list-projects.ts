import { z } from "zod";

import { listProjects } from "@/lib/projects/services/list-projects";

import { defineAiTool } from "../utils/define-ai-tool";

export const listProjectsTool = defineAiTool({
  name: "list_projects",
  description:
    "Liệt kê các project social listening mà key được đọc: id, tên, mô tả, case. " +
    "Gọi đầu tiên để lấy projectId cho các tool khác.",
  inputSchema: z.object({}),
  async run(_input, ctx) {
    const { items } = await listProjects({ workspaceId: ctx.workspaceId });
    return {
      items: items
        .filter((item) => !ctx.projectIds || ctx.projectIds.includes(item.id))
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          case: item.case,
          createdAt: item.createdAt,
        })),
    };
  },
});
