import { z } from "zod";

import {
  ALERT_RULE_KINDS,
  ALERT_WINDOWS,
  MAX_ALERT_RULES,
  NOTIFICATION_CHANNELS,
  REPORT_SCHEDULES,
} from "./alert-templates";
import { ENTITY_ROLES } from "./case-templates";
import { AVAILABLE_PROJECT_CASES, COMPARE_CASES, COMPARE_COMPETITORS, PROJECT_CASES } from "./project-cases";
import { collectProjectConfigIssues } from "./utils/collect-project-config-issues";

export const projectCaseSchema = z.enum(PROJECT_CASES);

export const availableProjectCaseSchema = z.enum(AVAILABLE_PROJECT_CASES);

const termListSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .default([]);

export const projectEntityInputSchema = z.object({
  /** Client-generated for new entities so alert rules can point at them before saving. */
  id: z.uuid(),
  role: z.enum(ENTITY_ROLES),
  name: z.string().trim().min(1, { error: "Nhập tên." }).max(120),
  aliases: termListSchema,
  /** Easy-to-confuse names; matching on them alone needs LLM confirmation (D11). */
  ambiguousAliases: termListSchema,
  /** Query terms: at least one must appear next to the name (optional). */
  withTerms: termListSchema,
  exclude: termListSchema,
});

export const projectAspectInputSchema = z.object({
  /** Client-generated for new aspects, like entity ids. */
  id: z.uuid(),
  key: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1, { error: "Nhập tên khía cạnh." }).max(80),
  description: z.string().trim().max(300).default(""),
});

export const ALERT_SCOPE_PATTERN =
  /^(project|entity:[0-9a-f-]{36}|aspect:[0-9a-f-]{36}|each_role:[a-z]+)$/;

export const projectAlertRuleInputSchema = z.object({
  /** Client-generated for new rules; kept on edit so alert rows stay linked. */
  id: z.uuid(),
  kind: z.enum(ALERT_RULE_KINDS),
  enabled: z.boolean(),
  /** `project`, `entity:<id>`, `aspect:<id>` or `each_role:<role>`. */
  scope: z.string().regex(ALERT_SCOPE_PATTERN, { error: "Chọn phạm vi." }),
  threshold: z.number({ error: "Nhập ngưỡng." }).positive({ error: "Ngưỡng phải lớn hơn 0." }),
  window: z.enum(ALERT_WINDOWS).nullable().default(null),
  minMentions: z.number().int().min(0).nullable().default(null),
  keywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
});

/** Alert rules and delivery. Evaluated hourly; only email is sent. */
export const projectAlertsInputSchema = z.object({
  rules: z
    .array(projectAlertRuleInputSchema)
    .max(MAX_ALERT_RULES, { error: `Tối đa ${MAX_ALERT_RULES} cảnh báo.` })
    .default([]),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).default(["email"]),
  recipients: z
    .array(z.email({ error: "Email không hợp lệ." }))
    .max(30)
    .default([]),
  reportSchedule: z.enum(REPORT_SCHEDULES).default("weekly"),
});

/** Entities, aspects, sources, case fields and alerts; shared by create and edit. */
export const projectConfigSchema = z
  .object({
    case: availableProjectCaseSchema,
    /** Case definition version; new projects use the latest, upgrades raise it. */
    caseVersion: z.number().int().positive(),
    caseConfig: z.record(z.string(), z.unknown()).default({}),
    entities: z.array(projectEntityInputSchema).max(60),
    aspects: z
      .array(projectAspectInputSchema)
      .min(1, { error: "Cần ít nhất một khía cạnh." })
      .max(20),
    sourceIds: z
      .array(z.uuid())
      .min(1, { error: "Chọn ít nhất một nguồn." })
      .max(100),
    alerts: projectAlertsInputSchema.default({
      rules: [],
      channels: ["email"],
      recipients: [],
      reportSchedule: "weekly",
    }),
  })
  .superRefine((value, ctx) => {
    for (const issue of collectProjectConfigIssues(value)) {
      ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
    }
  });

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, { error: "Project name is required." }),
  description: z.string().trim().optional(),
  case: projectCaseSchema.optional(),
});

/** Create body from the wizard: project info plus its full config. */
export const createProjectWithConfigSchema = projectConfigSchema.and(
  z.object({
    name: z.string().trim().min(1, { error: "Nhập tên project." }).max(120),
    description: z.string().trim().max(1000).optional(),
  }),
);

/** The members of a compare project (D30): the primary project and its competitors, in order. */
export const compareMembersSchema = z
  .object({
    primaryId: z.uuid({ error: "Chọn project chính." }),
    competitorIds: z
      .array(z.uuid())
      .min(COMPARE_COMPETITORS.min, { error: `Chọn ít nhất ${COMPARE_COMPETITORS.min} đối thủ.` })
      .max(COMPARE_COMPETITORS.max, { error: `Chọn tối đa ${COMPARE_COMPETITORS.max} đối thủ.` }),
  })
  .refine(
    ({ primaryId, competitorIds }) =>
      new Set([primaryId, ...competitorIds]).size === competitorIds.length + 1,
    { error: "Mỗi project chỉ chọn một lần.", path: ["competitorIds"] },
  );

/** Create body of a compare project: no sources, entities or aspects of its own. */
export const createCompareProjectSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Nhập tên project." }).max(120),
    description: z.string().trim().max(1000).optional(),
    case: z.enum(COMPARE_CASES),
  })
  .and(compareMembersSchema);

export const compareCheckQuerySchema = z.object({
  case: z.enum(COMPARE_CASES),
  primaryId: z.uuid(),
  /** Comma-separated project ids. */
  competitorIds: z
    .string()
    .transform((value) => value.split(",").filter(Boolean))
    .pipe(z.array(z.uuid()).max(COMPARE_COMPETITORS.max)),
});

export const updateCompareMembersSchema = compareMembersSchema;

export const projectChatWidgetSchema = z
  .object({
    enabled: z.boolean(),
    publicKey: z.string().trim().max(200),
  })
  .refine((value) => !value.enabled || value.publicKey.length > 0, {
    error: "Nhập public key để bật chat widget.",
    path: ["publicKey"],
  });

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, { error: "Project name is required." }).optional(),
  description: z.string().trim().nullable().optional(),
  chatWidget: projectChatWidgetSchema.optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
export type UpdateProjectValues = z.infer<typeof updateProjectSchema>;
export type ProjectConfigInput = z.input<typeof projectConfigSchema>;
export type ProjectConfigBody = z.output<typeof projectConfigSchema>;
export type CreateProjectWithConfigInput = z.input<typeof createProjectWithConfigSchema>;
export type CreateProjectWithConfigBody = z.output<typeof createProjectWithConfigSchema>;
export type ProjectAlertsInput = z.output<typeof projectAlertsInputSchema>;
export type CreateCompareProjectInput = z.input<typeof createCompareProjectSchema>;
export type CreateCompareProjectBody = z.output<typeof createCompareProjectSchema>;
