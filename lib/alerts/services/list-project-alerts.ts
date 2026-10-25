import { and, asc, desc, eq } from "drizzle-orm";

import { alertRules, alerts, projectAspects, projectEntities, projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import {
  ALERT_RULE_KIND_DEFS,
  ALERT_WINDOW_LABELS,
} from "@/lib/projects/alert-templates";
import {
  AVAILABLE_PROJECT_CASES,
  type AvailableProjectCase,
} from "@/lib/projects/project-cases";

import { ALERT_LIST_LIMIT } from "../config";
import type { AlertLevel, AlertStatus, ProjectAlertsResult } from "../types";
import { alertScopeSummary } from "../utils/alert-scope";
import { alertRecipients, wantsAlertEmail } from "../utils/alert-delivery";
import { parseStoredAlertRule, type StoredAlertRule } from "../utils/parse-stored-alert-rule";

const LEVELS = new Set<AlertLevel>(["high", "med", "low"]);
const STATUSES = new Set<AlertStatus>(["open", "emailed", "email_failed"]);

/** Recent firings and the enabled rules for the Alerts page. */
export async function listProjectAlerts(projectId: string): Promise<ProjectAlertsResult> {
  const [project] = await db
    .select({
      id: projects.id,
      listeningCase: projects.listeningCase,
      caseVersion: projects.caseVersion,
      notificationConfig: projects.notificationConfig,
    })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) throw new NotFoundError("projects", projectId);

  const [rows, rules, entities, aspects] = await Promise.all([
    db
      .select()
      .from(alerts)
      .where(eq(alerts.projectId, projectId))
      .orderBy(desc(alerts.triggeredAt))
      .limit(ALERT_LIST_LIMIT),
    db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.projectId, projectId), eq(alertRules.enabled, true)))
      .orderBy(asc(alertRules.sortOrder)),
    db
      .select({ id: projectEntities.id, name: projectEntities.name, role: projectEntities.role })
      .from(projectEntities)
      .where(eq(projectEntities.projectId, projectId)),
    db
      .select({ id: projectAspects.id, name: projectAspects.name })
      .from(projectAspects)
      .where(eq(projectAspects.projectId, projectId)),
  ]);

  const roleLabel = roleLabelFor(project.listeningCase, project.caseVersion);

  return {
    alerts: rows.flatMap((row) => {
      if (!LEVELS.has(row.level as AlertLevel) || !STATUSES.has(row.status as AlertStatus)) {
        return [];
      }
      return [{
        id: row.id,
        level: row.level as AlertLevel,
        title: row.title,
        body: row.body,
        status: row.status as AlertStatus,
        emailError: row.emailError,
        triggeredAt: row.triggeredAt.toISOString(),
      }];
    }),
    rules: rules.flatMap((rule) => {
      const parsed = parseStoredAlertRule(rule.kind, rule.params);
      if (!parsed) return [];
      return [{
        id: rule.id,
        label: ALERT_RULE_KIND_DEFS[parsed.kind].label,
        scope: alertScopeSummary(parsed.scope, entities, aspects, roleLabel),
        threshold: formatRuleThreshold(parsed),
        window: parsed.window ? ALERT_WINDOW_LABELS[parsed.window] : "Một bài",
        deliversEmail: wantsAlertEmail(rule.channels, project.notificationConfig.channels),
      }];
    }),
    recipientCount: alertRecipients(project.notificationConfig.recipients).length,
  };
}

/** One cell, in the same shape as the demo rules table: “+30% trong 24 giờ”. */
function formatRuleThreshold(rule: StoredAlertRule) {
  const amount = rule.threshold.toLocaleString("vi-VN");
  const span = rule.window ? ALERT_WINDOW_LABELS[rule.window] : null;
  if (rule.kind === "volume_growth" || rule.kind === "buyer_questions_growth") {
    return span ? `+${amount}% trong ${span}` : `+${amount}%`;
  }
  if (rule.kind === "negative_share") {
    return span ? `Tiêu cực > ${amount}% trong ${span}` : `Tiêu cực > ${amount}%`;
  }
  if (rule.kind === "price_deviation") {
    return span ? `Lệch > ${amount}% trong ${span}` : `Lệch > ${amount}%`;
  }
  if (rule.kind === "viral_post") return `> ${amount} lượt tương tác`;
  const words = rule.keywords.slice(0, 3).map((keyword) => `“${keyword}”`).join(", ");
  if (words) return span ? `${words} trong ${span}` : words;
  return span ? `≥ ${amount} bài trong ${span}` : `≥ ${amount} bài`;
}

function roleLabelFor(projectCase: string, version: number) {
  if (!(AVAILABLE_PROJECT_CASES as readonly string[]).includes(projectCase)) {
    return (role: string) => role;
  }
  const labels = new Map<string, string>(
    getCaseTemplate(projectCase as AvailableProjectCase, version).roles.map((role) => [
      role.role,
      role.label,
    ]),
  );
  return (role: string) => labels.get(role) ?? role;
}
