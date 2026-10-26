import { db } from "@/lib/db";
import { workspaceApiKeys } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";

import { createUnkeyClient, getUnkeyApiId } from "../config";
import type { CreateWorkspaceKeyParams, CreateWorkspaceKeyResult } from "../types";
import { assertKeyProjects } from "../utils/assert-key-projects";
import { toWorkspaceKeyItem } from "../utils/to-workspace-key-item";

const KEY_DISPLAY_LENGTH = 16;
const RATE_LIMIT_PER_MINUTE = 100;

export async function createWorkspaceKey(
  params: CreateWorkspaceKeyParams,
): Promise<CreateWorkspaceKeyResult> {
  const { workspaceId, name, scopes, projectIds, userId } = params;
  await assertKeyProjects(workspaceId, projectIds);

  const unkey = createUnkeyClient();
  const apiId = getUnkeyApiId();

  let rawKey: string;
  let unkeyKeyId: string;

  try {
    const { data } = await unkey.keys.createKey({
      apiId,
      name,
      externalId: workspaceId,
      prefix: "bnb",
      ratelimits: [
        {
          name: "requests",
          limit: RATE_LIMIT_PER_MINUTE,
          duration: 60_000,
          autoApply: true,
        },
      ],
    });

    if (!data?.key || !data?.keyId) {
      throw new CreateFailedError("API key");
    }

    rawKey = data.key;
    unkeyKeyId = data.keyId;
  } catch (err) {
    if (err instanceof CreateFailedError) throw err;
    throw new CreateFailedError("API key");
  }

  const keyStart = rawKey.substring(0, KEY_DISPLAY_LENGTH) + "…";

  const [row] = await db
    .insert(workspaceApiKeys)
    .values({ workspaceId, unkeyKeyId, name, keyStart, scopes, projectIds, createdBy: userId })
    .returning();

  if (!row) {
    throw new CreateFailedError("API key");
  }

  return {
    key: toWorkspaceKeyItem(row, null),
    rawKey,
  };
}
