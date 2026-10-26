import { createUnkeyClient } from "../config";
import type { VerifyWorkspaceKeyResult } from "../types";

export async function verifyWorkspaceKey(
  key: string,
): Promise<VerifyWorkspaceKeyResult> {
  const unkey = createUnkeyClient();

  try {
    const { data } = await unkey.keys.verifyKey({ key });

    if (!data?.valid) {
      const reason = data?.code ?? "INVALID";
      return { valid: false, workspaceId: null, reason };
    }

    const workspaceId = data.identity?.externalId ?? null;

    if (!workspaceId || !data.keyId) {
      return { valid: false, workspaceId: null, reason: "KEY_HAS_NO_WORKSPACE" };
    }

    return { valid: true, workspaceId, unkeyKeyId: data.keyId };
  } catch {
    return { valid: false, workspaceId: null, reason: "VERIFICATION_ERROR" };
  }
}
