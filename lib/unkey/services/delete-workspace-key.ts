import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaceApiKeys } from "@/db/schema";
import { NotFoundError, DeleteFailedError } from "@/lib/common/service-errors";

import { createUnkeyClient } from "../config";
import type { DeleteWorkspaceKeyParams } from "../types";

export async function deleteWorkspaceKey(
  params: DeleteWorkspaceKeyParams,
): Promise<{ message: string }> {
  const { workspaceId, keyId } = params;

  const [row] = await db
    .select()
    .from(workspaceApiKeys)
    .where(
      and(
        eq(workspaceApiKeys.id, keyId),
        eq(workspaceApiKeys.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("API key", keyId);
  }

  const unkey = createUnkeyClient();

  try {
    await unkey.keys.deleteKey({ keyId: row.unkeyKeyId });
  } catch {
    throw new DeleteFailedError("API key");
  }

  await db
    .delete(workspaceApiKeys)
    .where(eq(workspaceApiKeys.id, keyId));

  return { message: "API key deleted." };
}
