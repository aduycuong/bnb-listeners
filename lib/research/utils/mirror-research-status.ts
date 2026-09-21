import { getAdminDatabase } from "@/lib/firebase/admin";

import type { ResearchStatus } from "../types";

type MirrorResearchStatusParams = {
  runId: string;
  workspaceId: string;
  status: ResearchStatus;
  error?: string | null;
};

/**
 * Best-effort mirror of a research run's status to Firebase RTDB at
 * `jobs/{runId}` for any live UI. No-ops when Firebase admin is not
 * configured; failures never affect the run.
 *
 * `runId` is an unguessable uuid and doubles as the RTDB key. RTDB read
 * rules should scope access (e.g. `auth != null` + workspace ownership).
 */
export async function mirrorResearchStatus(
  params: MirrorResearchStatusParams,
): Promise<void> {
  try {
    const db = getAdminDatabase();
    if (!db) return;

    const now = Date.now();
    await db.ref(`jobs/${params.runId}`).update({
      status: params.status,
      workspaceId: params.workspaceId,
      error: params.error ?? null,
      updatedAt: now,
    });
  } catch (error) {
    console.warn("[research] Failed to mirror status to RTDB", error);
  }
}
