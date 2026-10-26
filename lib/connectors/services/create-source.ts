import type { CreateSourceBody } from "../schema";
import type { CreateSourceResult } from "../types";
import { collectSource } from "./collect-source";
import { registerFacebookSource } from "./register-facebook-source";
import { registerTiktokSearchSource } from "./register-tiktok-search-source";
import { registerTiktokSource } from "./register-tiktok-source";

/**
 * Registers a connector source from the admin console and, when asked, starts
 * its first post run: the scheduler only picks up sources collected once. A
 * source that already exists is returned as is, without a run. A run that
 * fails to start leaves the source registered and reports why.
 */
export async function createSource(params: CreateSourceBody): Promise<CreateSourceResult> {
  const name = params.name || null;
  const { sourceId, created } =
    params.kind === "facebook"
      ? await registerFacebookSource({ url: params.url, name })
      : params.kind === "tiktok-channel"
        ? await registerTiktokSource({ url: params.url, name })
        : await registerTiktokSearchSource({
            keyword: params.keyword,
            region: params.region || undefined,
          });

  if (!created || !params.collectNow) {
    return { sourceId, created, collectRunId: null, collectError: null };
  }

  try {
    const run = await collectSource({ sourceId });
    return { sourceId, created, collectRunId: run.collectRunId, collectError: null };
  } catch (error) {
    console.error("[connectors] first post run did not start", { sourceId, error });
    return {
      sourceId,
      created,
      collectRunId: null,
      collectError: error instanceof Error ? error.message : "Could not start the first run.",
    };
  }
}
