import { z } from "zod";

import {
  ALERT_RULE_KIND_DEFS,
  ALERT_RULE_KINDS,
  ALERT_WINDOWS,
  type AlertRuleKind,
  type AlertWindow,
} from "@/lib/projects/alert-templates";

const storedAlertParamsSchema = z.object({
  scope: z.discriminatedUnion("type", [
    z.object({ type: z.literal("project") }),
    z.object({ type: z.literal("entity"), entityId: z.uuid() }),
    z.object({ type: z.literal("aspect"), aspectId: z.uuid() }),
    z.object({ type: z.literal("each_role"), role: z.string().trim().min(1) }),
  ]),
  threshold: z.number().positive(),
  window: z.enum(ALERT_WINDOWS).nullable().optional(),
  minMentions: z.number().int().min(0).nullable().optional(),
  keywords: z.array(z.string()).optional(),
});

export type StoredAlertScope = z.infer<typeof storedAlertParamsSchema>["scope"];

export type StoredAlertRule = {
  kind: AlertRuleKind;
  scope: StoredAlertScope;
  threshold: number;
  window: AlertWindow | null;
  minMentions: number | null;
  keywords: string[];
};

/** Drop a stored row the evaluator cannot trust instead of filling in a threshold. */
export function parseStoredAlertRule(kind: string, params: unknown): StoredAlertRule | null {
  if (!(ALERT_RULE_KINDS as readonly string[]).includes(kind)) return null;
  const parsed = storedAlertParamsSchema.safeParse(params);
  if (!parsed.success) return null;
  const ruleKind = kind as AlertRuleKind;
  const window = ruleKind === "viral_post"
    ? null
    : (parsed.data.window ?? ALERT_RULE_KIND_DEFS[ruleKind].defaultWindow);
  return {
    kind: ruleKind,
    scope: parsed.data.scope,
    threshold: parsed.data.threshold,
    window,
    minMentions: parsed.data.minMentions ?? null,
    keywords: (parsed.data.keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean),
  };
}
