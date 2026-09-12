import { eq } from "drizzle-orm";

import { termGroupMemberRebuildRuns, termGroups } from "@/db/schema";
import {
  CreateFailedError,
  UnknownServiceError,
} from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { addJob } from "@/lib/qstash/services/add-job-service";
import {
  DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME,
} from "@/lib/term-groups/term-group-member-rebuild-config";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  CreateTermGroupMemberRebuildRunParams,
  CreateTermGroupMemberRebuildRunResult,
} from "../types";
import { loadTermGroupRebuildContext } from "../utils/load-term-group-rebuild-context";
import { toTermGroupMemberRebuildRunItem } from "../utils/to-term-group-member-rebuild-run-item";
import { estimateTermGroupMemberRebuild } from "./estimate-term-group-member-rebuild";

export async function createTermGroupMemberRebuildRun(
  params: CreateTermGroupMemberRebuildRunParams,
  ctx: WorkspaceContext,
): Promise<CreateTermGroupMemberRebuildRunResult> {
  const group = await loadTermGroupRebuildContext(params.id, ctx.workspaceId);

  if (group.activeMemberRebuildRunId) {
    throw new UnknownServiceError(
      "A member rebuild job is already running for this term group.",
    );
  }

  const estimateResult = await estimateTermGroupMemberRebuild(params, ctx);

  const [run] = await db
    .insert(termGroupMemberRebuildRuns)
    .values({
      workspaceId: ctx.workspaceId,
      termGroupId: group.id,
      status: "pending",
      model: estimateResult.model ?? DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
      includeAlreadyMembers: estimateResult.includeAlreadyMembers,
      removeNonMatching: estimateResult.removeNonMatching,
      enableWebResearch: estimateResult.enableWebResearch,
      confidenceMin: estimateResult.confidenceMin,
      estimate: estimateResult.estimate,
      triggeredBy: ctx.userId,
    })
    .returning();

  if (!run) {
    throw new CreateFailedError("term_group_member_rebuild_run");
  }

  await db
    .update(termGroups)
    .set({ activeMemberRebuildRunId: run.id })
    .where(eq(termGroups.id, group.id));

  await addJob({
    jobName: TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME,
    payload: { runId: run.id },
    userId: ctx.userId,
    flowControl: {
      key: `term-group-member-rebuild-${group.id}`,
      parallelism: 1,
    },
  });

  return { run: toTermGroupMemberRebuildRunItem(run) };
}
