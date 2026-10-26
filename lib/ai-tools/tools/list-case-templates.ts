import { z } from "zod";

import { getCaseTemplate } from "@/lib/projects/case-templates";
import { AVAILABLE_PROJECT_CASES } from "@/lib/projects/project-cases";

import { CASE_DESCRIPTIONS } from "../config";
import { defineAiTool } from "../utils/define-ai-tool";

export const listCaseTemplatesTool = defineAiTool({
  name: "list_case_templates",
  scope: "projects:write",
  description:
    "Các case có thể tạo project: mục đích, vai trò đối tượng (số lượng tối thiểu, tối đa), " +
    "khía cạnh mặc định và trường caseConfig (JSON Schema). Gọi trước create_project.",
  inputSchema: z.object({}),
  async run() {
    return {
      cases: AVAILABLE_PROJECT_CASES.map((projectCase) => {
        const template = getCaseTemplate(projectCase);
        return {
          case: projectCase,
          description: CASE_DESCRIPTIONS[projectCase],
          roles: template.roles.map((role) => ({
            role: role.role,
            label: role.label,
            hint: role.hint,
            example: role.placeholder,
            min: role.min,
            max: role.max,
          })),
          aspects: template.aspects.map((aspect) => ({
            name: aspect.name,
            description: aspect.description,
          })),
          caseConfigSchema: z.toJSONSchema(template.configSchema, { io: "input" }),
          defaultCaseConfig: template.defaultConfig,
        };
      }),
    };
  },
});
