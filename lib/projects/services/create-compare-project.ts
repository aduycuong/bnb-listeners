import { randomUUID } from "node:crypto";

import { projectCompareMembers, projects } from "@/db/schema";
import { CreateFailedError, InvalidInputError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { CreateCompareProjectParams, CreateProjectResult } from "../types";
import { toProjectListItem } from "../utils/to-project-list-item";
import { assertUniqueProjectName } from "./assert-unique-project-name";
import { checkCompareMembers } from "./check-compare-members";

/**
 * Creates a compare project and its members (D30). It only reads its members, so it has no
 * sources, entities, aspects, enrichers or alert rules, and no scheduled AI report.
 */
export async function createCompareProject(
  params: CreateCompareProjectParams,
): Promise<CreateProjectResult> {
  const name = params.name.trim();
  await assertUniqueProjectName(params.workspaceId, name);
  const check = await checkCompareMembers({
    workspaceId: params.workspaceId,
    case: params.case,
    memberIds: params.memberIds,
  });
  if (check.issues.length) throw new InvalidInputError(check.issues.join(" "));

  const projectId = randomUUID();
  const [created] = await db.batch([
    db
      .insert(projects)
      .values({
        id: projectId,
        workspaceId: params.workspaceId,
        name,
        description: params.description?.trim() || null,
        listeningCase: params.case,
        caseVersion: 1,
        caseConfig: {},
        notificationConfig: { channels: [], recipients: [], reportSchedule: "none" },
      })
      .returning(),
    db.insert(projectCompareMembers).values(
      params.memberIds.map((memberProjectId, sortOrder) => ({
        compareProjectId: projectId,
        memberProjectId,
        sortOrder,
      })),
    ),
  ]);

  const project = created[0];
  if (!project) throw new CreateFailedError("project");

  return { ...toProjectListItem(project), message: `Đã tạo project “${project.name}”.` };
}
