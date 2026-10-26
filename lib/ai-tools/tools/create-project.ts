import { randomUUID } from "node:crypto";

import { z } from "zod";

import { InvalidInputError } from "@/lib/common/service-errors";
import { REPORT_SCHEDULES } from "@/lib/projects/alert-templates";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import { AVAILABLE_PROJECT_CASES } from "@/lib/projects/project-cases";
import { createProjectWithConfigSchema } from "@/lib/projects/schema";
import { assertSourcesSelectable } from "@/lib/projects/services/assert-sources-selectable";
import { assertUniqueProjectName } from "@/lib/projects/services/assert-unique-project-name";
import { createProjectWithConfig } from "@/lib/projects/services/create-project-with-config";
import { seedToAlertRuleInput } from "@/lib/projects/utils/to-alert-rule-input";

import { toolEntityInputSchema, toolSourceIdsSchema } from "../schema";
import { assertToolCanCreateProjects } from "../utils/assert-tool-can-create-projects";
import { defineAiTool } from "../utils/define-ai-tool";
import { previewEntityMatches } from "./preview-project-match";

const inputSchema = z.object({
  case: z.enum(AVAILABLE_PROJECT_CASES).describe("Kiểu case, xem list_case_templates."),
  name: z.string().trim().min(1).max(120).describe("Tên project, không trùng trong workspace."),
  description: z.string().trim().max(1000).optional(),
  caseConfig: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Trường riêng của case theo caseConfigSchema; bỏ trống là mặc định của case."),
  entities: z.array(toolEntityInputSchema).min(1).max(60),
  aspects: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(20)
    .optional()
    .describe("Khía cạnh theo dõi; bỏ trống là khía cạnh mặc định của case."),
  sourceIds: toolSourceIdsSchema,
  alertRecipients: z
    .array(z.email())
    .max(30)
    .optional()
    .describe(
      "Email nhận cảnh báo; bỏ trống là email người tạo key. Cảnh báo mặc định của case bật sẵn.",
    ),
  reportSchedule: z.enum(REPORT_SCHEDULES).optional(),
  dryRun: z
    .boolean()
    .default(true)
    .describe(
      "Mặc định true: chỉ kiểm tra và đếm thử, chưa tạo. Đặt false sau khi người dùng đồng ý.",
    ),
});

/** Wizard values from the tool input: ids, template aspects and the case's alert rules. */
function toCreateProjectValues(input: z.output<typeof inputSchema>, userEmail: string | null) {
  const template = getCaseTemplate(input.case);
  const entities = input.entities.map((entity) => ({
    id: randomUUID(),
    role: entity.role,
    name: entity.name,
    aliases: entity.aliases ?? [],
    ambiguousAliases: entity.ambiguousAliases ?? [],
    withTerms: entity.withTerms ?? [],
    exclude: entity.exclude ?? [],
  }));
  const aspects = (input.aspects ?? template.aspects).map((aspect) => ({
    id: randomUUID(),
    name: aspect.name,
    description: aspect.description ?? "",
  }));
  // Alert seeds point at template aspects by key; custom aspects with a template name keep it.
  const seededAspects = aspects.map((aspect) => ({
    ...aspect,
    key: template.aspects.find((item) => item.name === aspect.name)?.key,
  }));

  return {
    name: input.name,
    description: input.description,
    case: input.case,
    caseVersion: template.version,
    caseConfig: { ...template.defaultConfig, ...input.caseConfig },
    entities,
    aspects,
    sourceIds: input.sourceIds,
    alerts: {
      rules: template.alertSeeds
        .map((seed) => seedToAlertRuleInput(seed, entities, seededAspects))
        .filter((rule) => rule !== null),
      channels: ["email" as const],
      recipients: input.alertRecipients ?? (userEmail ? [userEmail] : []),
      reportSchedule: input.reportSchedule ?? "weekly",
    },
  };
}

export const createProjectTool = defineAiTool({
  name: "create_project",
  scope: "projects:write",
  writes: true,
  description:
    "Tạo project social listening trong workspace, như wizard trên web. Mặc định dryRun: chỉ " +
    "kiểm tra cấu hình và đếm thử bài khớp, trả bản tóm tắt để người dùng xem lại; gọi lại " +
    "với dryRun: false để tạo thật. Tool tự thêm khía cạnh và cảnh báo mặc định của case.",
  inputSchema,
  async run(input, ctx) {
    await assertToolCanCreateProjects(ctx);
    const parsed = createProjectWithConfigSchema.safeParse(
      toCreateProjectValues(input, ctx.userEmail),
    );
    if (!parsed.success) {
      throw new InvalidInputError(
        parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
          .join("; "),
      );
    }
    const values = parsed.data;

    if (!input.dryRun) {
      const project = await createProjectWithConfig({ ...values, workspaceId: ctx.workspaceId });
      return {
        created: true,
        project: { id: project.id, name: project.name, case: project.case },
        message: project.message,
      };
    }

    await assertUniqueProjectName(ctx.workspaceId, values.name);
    await assertSourcesSelectable({ sourceIds: values.sourceIds });
    return {
      created: false,
      message: "Chưa tạo. Cho người dùng xem lại, rồi gọi lại với dryRun: false để tạo.",
      project: {
        name: values.name,
        case: values.case,
        caseConfig: values.caseConfig,
        entities: values.entities.map((entity) => ({
          role: entity.role,
          name: entity.name,
          aliases: entity.aliases,
          ambiguousAliases: entity.ambiguousAliases,
          withTerms: entity.withTerms,
          exclude: entity.exclude,
        })),
        aspects: values.aspects.map((aspect) => aspect.name),
        sources: values.sourceIds.length,
        alertRules: values.alerts.rules.filter((rule) => rule.enabled).map((rule) => rule.kind),
        alertRecipients: values.alerts.recipients,
        reportSchedule: values.alerts.reportSchedule,
      },
      matchPreview: await previewEntityMatches(values.sourceIds, input.entities),
    };
  },
});
