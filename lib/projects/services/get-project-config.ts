import { and, asc, eq } from "drizzle-orm";

import {
  alertRules,
  projectAspects,
  projectEntities,
  projectQueries,
  projects,
  projectSources,
} from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import {
  ALERT_TEMPLATES,
  NOTIFICATION_CHANNELS,
  REPORT_SCHEDULES,
  type NotificationChannel,
  type ReportSchedule,
} from "../alert-templates";
import type { EntityRole } from "../case-templates";
import { isAvailableProjectCase, parseProjectCase } from "../project-cases";
import type { GetProjectConfigParams, ProjectConfigDetail } from "../types";

export async function getProjectConfig(
  params: GetProjectConfigParams,
): Promise<ProjectConfigDetail> {
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, params.projectId),
        eq(projects.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError("project", params.projectId);
  }

  const [entities, queries, aspects, sourceRows, ruleRows] = await Promise.all([
    db
      .select()
      .from(projectEntities)
      .where(eq(projectEntities.projectId, project.id))
      .orderBy(asc(projectEntities.sortOrder), asc(projectEntities.createdAt)),
    db.select().from(projectQueries).where(eq(projectQueries.projectId, project.id)),
    db
      .select()
      .from(projectAspects)
      .where(eq(projectAspects.projectId, project.id))
      .orderBy(asc(projectAspects.sortOrder), asc(projectAspects.createdAt)),
    db
      .select({ sourceId: projectSources.sourceId })
      .from(projectSources)
      .where(eq(projectSources.projectId, project.id)),
    db.select().from(alertRules).where(eq(alertRules.projectId, project.id)),
  ]);

  const queryByEntity = new Map(
    queries.filter((query) => query.entityId).map((query) => [query.entityId, query]),
  );

  const projectCase = parseProjectCase(project.listeningCase);
  const rulesByKey = new Map(ruleRows.map((row) => [row.key, row]));
  const notification = project.notificationConfig;

  return {
    projectId: project.id,
    case: projectCase,
    mode: project.mode === "sandbox" ? "sandbox" : "live",
    configVersion: project.configVersion,
    caseConfig: project.caseConfig,
    entities: entities.map((entity) => {
      const query = queryByEntity.get(entity.id);
      return {
        id: entity.id,
        role: entity.role as EntityRole,
        name: entity.name,
        aliases: entity.aliases,
        queryId: query?.id ?? null,
        withTerms: query?.withTerms ?? [],
        exclude: query?.exclude ?? [],
        queryVersion: query?.version ?? null,
      };
    }),
    aspects: aspects.map((aspect) => ({
      id: aspect.id,
      key: aspect.key,
      name: aspect.name,
      description: aspect.description,
    })),
    sourceIds: sourceRows.map((row) => row.sourceId),
    alerts: {
      // Template order; rules without a row yet show at the default threshold, disabled.
      rules: (isAvailableProjectCase(projectCase) ? ALERT_TEMPLATES[projectCase] : []).map(
        (template) => {
          const row = rulesByKey.get(template.key);
          const threshold = row?.params.threshold;
          return {
            key: template.key,
            enabled: row?.enabled ?? false,
            threshold: typeof threshold === "number" ? threshold : template.defaultThreshold,
          };
        },
      ),
      channels: (notification.channels ?? ["email"]).filter(
        (channel): channel is NotificationChannel =>
          (NOTIFICATION_CHANNELS as readonly string[]).includes(channel),
      ),
      recipients: notification.recipients ?? [],
      reportSchedule: (REPORT_SCHEDULES as readonly string[]).includes(
        notification.reportSchedule ?? "",
      )
        ? (notification.reportSchedule as ReportSchedule)
        : "weekly",
    },
  };
}
