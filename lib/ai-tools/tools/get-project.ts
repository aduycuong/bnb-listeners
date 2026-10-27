import { z } from "zod";

import { getProjectConfig } from "@/lib/projects/services/get-project-config";

import { toolProjectIdSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";

export const getProjectTool = defineAiTool({
  name: "get_project",
  scope: null,
  description:
    "Cấu hình của một project: case, đối tượng theo dõi (chủ thể, các dự án của chủ đầu tư) " +
    "và các khía cạnh. Dùng id đối tượng và khía cạnh để lọc search_mentions.",
  inputSchema: z.object({ projectId: toolProjectIdSchema }),
  async run({ projectId }, ctx) {
    await assertToolProject(ctx, projectId);
    const config = await getProjectConfig({ workspaceId: ctx.workspaceId, projectId });
    return {
      projectId: config.projectId,
      case: config.case,
      caseConfig: config.caseConfig,
      entities: config.entities.map((entity) => ({
        id: entity.id,
        role: entity.role,
        name: entity.name,
        aliases: entity.aliases,
      })),
      aspects: config.aspects.map((aspect) => ({
        id: aspect.id,
        name: aspect.name,
        description: aspect.description,
      })),
      sources: config.sourceIds.length,
    };
  },
});
